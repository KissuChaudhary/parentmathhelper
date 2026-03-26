import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { serverEnv } from "@/env";

const execFileAsync = promisify(execFile);
const PARSE_ERROR_MARKERS = [
  "PARSE_ERROR:",
  "GEOMETRY_PARSE_ERROR:",
  "ARITHMETIC_PARSE_ERROR:",
  "PROBABILITY_PARSE_ERROR:",
  "STATISTICS_PARSE_ERROR:",
  "ALGEBRA_PARSE_ERROR:",
  "TRIGONOMETRY_PARSE_ERROR:",
];

function normalizeExecution(stdout: string, stderr?: string): NormalizedExecution {
  const trimmedStdout = stdout.trim();
  const marker = PARSE_ERROR_MARKERS.find((item) => trimmedStdout.includes(item));
  if (stderr?.trim()) {
    return {
      success: false,
      output: trimmedStdout,
      error: stderr.trim(),
      errorCode: "RUNTIME_ERROR",
      retryHint: "Provide a clear math expression with explicit numbers and operators.",
    };
  }
  if (marker) {
    const markerLine = trimmedStdout
      .split("\n")
      .find((line) => line.includes(marker))
      ?.trim();
    const errorCode = marker.replace(":", "");
    const retryHint =
      marker === "GEOMETRY_PARSE_ERROR:"
        ? "Use explicit geometry values, for example: radius = 7, height = 10."
        : marker === "PROBABILITY_PARSE_ERROR:"
          ? "Provide explicit probability parameters, for example n, k, and p."
          : marker === "STATISTICS_PARSE_ERROR:"
            ? "Provide a numeric dataset like [1, 2, 3, 4] and the target metric."
            : "Provide a direct math expression with explicit values.";
    return {
      success: false,
      output: trimmedStdout,
      error: markerLine || "Expression parsing failed.",
      errorCode,
      retryHint,
    };
  }
  return {
    success: true,
    output: trimmedStdout,
    error: undefined,
  };
}

export interface MathInterpreterInput {
  code: string;
  title: string;
  problemType: string;
  expectedOutput?: string;
}

export interface MathInterpreterResult {
  success: boolean;
  title: string;
  problemType: string;
  output: string;
  error?: string;
  errorCode?: string;
  retryHint?: string;
  expectedOutput?: string;
  executionTime: string;
  runtime: "daytona" | "python" | "none";
}

type NormalizedExecution = {
  success: boolean;
  output: string;
  error?: string;
  errorCode?: string;
  retryHint?: string;
};

async function runWithRuntime(command: string, args: string[]) {
  return execFileAsync(command, args, {
    timeout: serverEnv.DAYTONA_SANDBOX_TIMEOUT,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

async function runInDaytona(code: string) {
  if (!serverEnv.DAYTONA_API_KEY || !serverEnv.DAYTONA_SNAPSHOT_NAME) {
    return null;
  }

  try {
    const importer = new Function("m", "return import(m)") as (moduleName: string) => Promise<any>;
    const sdk = await importer("@daytonaio/sdk");
    const { Daytona } = sdk;

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: "us",
    });

    const sandbox = await daytona.create({
      snapshot: serverEnv.DAYTONA_SNAPSHOT_NAME,
    });

    try {
      const execution = await sandbox.process.codeRun(code);
      const stdout = String(execution?.artifacts?.stdout || execution?.result || "").trim();
      const stderr = String(execution?.artifacts?.stderr || "").trim();
      const normalized = normalizeExecution(stdout, stderr);
      return {
        success: normalized.success,
        output: normalized.output,
        error: normalized.error,
        errorCode: normalized.errorCode,
        retryHint: normalized.retryHint,
      };
    } finally {
      await sandbox.delete().catch(() => undefined);
    }
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error?.message || "Failed to execute in Daytona sandbox",
    };
  }
}

export async function mathInterpreterTool({
  code,
  title,
  problemType,
  expectedOutput,
}: MathInterpreterInput): Promise<MathInterpreterResult> {
  const wrappedCode = `from sympy import *
import sys
sys.stdout.reconfigure(encoding='utf-8')
${code}`;

  const daytonaResult = await runInDaytona(wrappedCode);
  if (daytonaResult?.success) {
    return {
      success: daytonaResult.success,
      title,
      problemType,
      output: daytonaResult.output,
      error: daytonaResult.error,
      expectedOutput,
      executionTime: new Date().toISOString(),
      runtime: "daytona",
    };
  }

  const attempts: Array<["python" | "none", string, string[]]> = [
    ["python", "python", ["-c", wrappedCode]],
    ["python", "py", ["-3", "-c", wrappedCode]],
  ];

  for (const [runtime, command, args] of attempts) {
    try {
      const result = await runWithRuntime(command, args);
      const stderr = result.stderr?.trim();
      const stdout = result.stdout?.trim() || "";
      const normalized = normalizeExecution(stdout, stderr);
      return {
        success: normalized.success,
        title,
        problemType,
        output: normalized.output,
        error: normalized.error,
        errorCode: normalized.errorCode,
        retryHint: normalized.retryHint,
        expectedOutput,
        executionTime: new Date().toISOString(),
        runtime,
      };
    } catch {}
  }

  return {
    success: false,
    title,
    problemType,
    output: "",
    error: daytonaResult?.error || "Python runtime or SymPy is unavailable on this server.",
    expectedOutput,
    executionTime: new Date().toISOString(),
    runtime: "none",
  };
}
