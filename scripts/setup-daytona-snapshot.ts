async function setupDaytonaEnvironment() {
  const importer = new Function("m", "return import(m)") as (moduleName: string) => Promise<any>;
  try {
    const dotenv = await importer("dotenv");
    dotenv.config({ path: ".env.local" });
  } catch {}

  const { Daytona, Image, CreateSnapshotParams, Resources } = await importer("@daytonaio/sdk");
  const daytonaApiKey = process.env.DAYTONA_API_KEY;
  if (!daytonaApiKey) {
    console.error("❌ DAYTONA_API_KEY not found in .env.local");
    process.exit(1);
  }

  console.log('🚀 Setting up Daytona Python math solver environment...\n');

  const daytona = new Daytona({
    apiKey: daytonaApiKey,
    target: 'us',
  });

  try {
    console.log('📦 Creating Python image with SymPy and libraries...');

    // Define image with all math libraries
    const image = (
      Image.debian_slim('3.12')
        // Install Python packages
        .pip_install([
          'sympy==1.12',           // ✨ Main symbolic math library
          'numpy==1.24.3',         // Numerical operations
          'scipy==1.11.1',         // Advanced scientific computing
          'matplotlib==3.7.2',     // Plotting (if visualization needed)
          'pandas==2.0.3',         // Data manipulation
          'scikit-learn==1.3.0',   // Machine learning
          'mpmath==1.3.0',         // Arbitrary precision arithmetic
        ])
        // Optional: Install LaTeX for better rendering
        .run_commands(
          'apt-get update && apt-get install -y texlive-latex-base 2>/dev/null || true',
        )
    );

    console.log('🔨 Building snapshot (this may take 2-5 minutes)...\n');

    // Create snapshot
    const snapshot = await daytona.snapshot.create(
      new CreateSnapshotParams({
        name: `math-solver-env-${Date.now()}`,
        image,
        resources: new Resources({
          cpu: 2,           // 2 CPU cores
          memory: 4,        // 4GB RAM
          disk: 10,         // 10GB disk
        }),
      })
    );

    console.log('✅ Snapshot created successfully!\n');
    console.log('═════════════════════════════════════════════');
    console.log('📋 SNAPSHOT DETAILS:');
    console.log(`   Name: ${snapshot.name}`);
    console.log(`   ID: ${snapshot.id}`);
    console.log(`   Status: Ready for use`);
    console.log('═════════════════════════════════════════════\n');

    console.log('🔧 UPDATE YOUR .env.local WITH:\n');
    console.log(`DAYTONA_SNAPSHOT_NAME=${snapshot.name}\n`);

    console.log('📝 OR add to your configuration:\n');
    console.log(`export const SNAPSHOT_NAME = "${snapshot.name}";\n`);

    // Test the snapshot
    console.log('🧪 Testing snapshot with sample SymPy code...\n');

    const testSandbox = await daytona.create({
      snapshot: snapshot.name,
    });

    const testCode = `
from sympy import symbols, solve, Eq
x = symbols('x')
equation = Eq(x**2 + 5*x + 6, 0)
solutions = solve(equation, x)
print(f"Test successful! Solutions: {solutions}")
`;

    const testExecution = await testSandbox.process.codeRun(testCode);
    console.log('Test Output:', testExecution.artifacts?.stdout || testExecution.result);

    await testSandbox.delete();

    console.log('\n✅ All setup complete! Ready to use.\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDaytonaEnvironment();
