I've analyzed to big opensource repostires of agents 
https://github.com/zaidmukaddam/scira
https://github.com/cgoinglove/better-chatbot
,to understand how their tool-calling/function mechanics work for AI models. 

---

## **How Tool Calling Works: A Natural Explanation**

Based on analyzing both **Scira** and **Better Chatbot**, here's how the mechanics of tool calling operate from start to finish:

### **1. The Foundation: Tools Are Defined & Registered**

Before any AI model ever sees a tool, it must be **defined and registered** in the system. Think of this like creating a catalog of available services.

In **Scira**, tools are created using the Vercel AI SDK and xAI's tools API. For example:
- `xai.tools.xSearch()` — a tool for searching X/Twitter posts
- `webSearchTool()` — a tool for web searching
- `code_interpreter` — a tool for running code

In **Better Chatbot**, tools are loaded from multiple sources:
- **App Default Tools** (hardcoded): web search, code execution, data visualization
- **MCP Tools** (dynamically loaded): tools from MCP servers that users configure
- **Workflow Tools** (dynamically loaded): custom automation workflows created by users
- **Image Generation Tools**: for creating/editing images with various AI models

Each tool has a **schema** — a structured description that defines:
- What the tool does (description)
- What parameters it accepts (input schema)
- What data type it returns (output)

### **2. The Model Discovers Available Tools via System Prompts**

When you start a chat, the AI model doesn't magically know about tools. Instead, the application tells the model about them through **system prompts** — special instructions that frame what the model can do.

In **Scira**, the system prompt explicitly guides the model:

> "You are Scira MCP mode. You are connected to user-provided MCP tools... CRITICAL — ALWAYS USE TOOLS FIRST... For EVERY user message, determine which MCP tools are relevant and call them — no exceptions."

This is key: the system prompt **urgently instructs** the model that tools exist and should be used. The model understands through natural language that these tools are available.

In **Better Chatbot**, the system prompt is **dynamically built** based on what tools are actually available:

```
"Strategic Tool Selection: Select only tools crucially necessary for achieving the agent's 
mission effectively from available tools: [list of tool names and descriptions]"
```

The prompt tells the model what tools exist and when/why to use them. Different agents get different prompts with different tool lists.

### **3. Tools Are "Bound" to the API Call**

Once the model knows about tools (via system prompt), the actual tools are **passed to the AI SDK function call** as a parameters object.

In **Scira**, when calling `generateText()` or `streamText()`:

```typescript
const result = await generateText({
  model: xai.responses('grok-4-fast'),
  system: systemPromptWithToolInstructions,
  messages: userMessages,
  tools: {
    x_search: xai.tools.xSearch(configOptions),
    web_search: webSearchTool(),
    code_interpreter: codeInterpreterTool(),
  },
  // ... other options
});
```

The `tools` object contains **actual executable functions**, not just descriptions.

In **Better Chatbot**, tools are passed similarly to the Vercel AI `streamText()` or `generateObject()` functions:

```typescript
const result = streamText({
  model: chatModel,
  system: systemPrompt,
  tools: {
    ...MCP_TOOLS,        // Real MCP tool functions
    ...WORKFLOW_TOOLS,   // Real workflow tool functions
    ...APP_DEFAULT_TOOLS // Real app tool functions
  },
  toolChoice: "auto",    // Let model decide when to call
  messages: conversationHistory
});
```

### **4. The AI Model Decides WHEN & HOW to Call Tools**

This is the magic part: **the AI model itself decides if, when, and how to use tools**.

Here's the flow:

1. **User sends a message**: "Search for latest AI news"
2. **Model receives**: The message + system prompt + available tools definition
3. **Model thinks**: "The user wants information I don't have. I should call the web_search tool."
4. **Model generates**: A structured **tool call** (JSON) specifying:
   - Which tool to use: `web_search`
   - What parameters to pass: `{ query: "latest AI news 2026" }`

The model doesn't execute the tool itself — it just **decides and announces** that a tool should be called.

In **Scira**, the system has multiple modalities:

- **"Auto" mode**: The model decides freely which tools to call, can call multiple tools, reasoning tools, etc.
- **"Manual" mode**: Tools won't execute automatically; the model suggests them, and the user manually confirms
- **Forced tool choice**: Via `prepareStep()`, you can **force** the model to use specific tools first:

```typescript
prepareStep: ({ stepNumber }) => {
  if (stepNumber === 0) {
    return {
      toolChoice: { toolName: 'xql', type: 'tool' },  // FORCE first step to be this tool
      activeTools: ['xql'],  // ONLY this tool available
    };
  }
}
```

In **Better Chatbot**, tool choice is controlled by:

```typescript
toolChoice: "manual"  // User must approve each tool call
toolChoice: "auto"    // Model calls tools automatically
toolChoice: "none"    // No tools available
mentions: [...]       // User can @mention specific tools to force them
```

### **5. The SDK Executes the Tool & Returns Results**

Once the model decides to call a tool, the Vercel AI SDK **automatically**:

1. **Intercepts** the tool call request
2. **Executes** the actual tool function with the parameters the model specified
3. **Captures** the tool's output/response
4. **Sends the result back** to the model as a new message

For example, if the model calls `web_search({ query: "latest AI news 2026" })`:

```typescript
// The SDK runs this internally:
const result = await webSearchTool.execute({ 
  query: "latest AI news 2026" 
});
// Returns: { results: [...], citations: [...] }

// Then sends back to model as:
{
  role: "tool",
  content: result,
  toolName: "web_search"
}
```

This happens in a **loop** — the model can see the tool result and decide to call MORE tools if needed.

### **6. Active Tools & Tool Filtering**

Not all tools are always available. The system can **filter** which tools the model can access using `activeTools`:

In **Scira**:
```typescript
activeTools: ['web_search', 'code_interpreter']  // Only these available
```

In **Better Chatbot**, filtering happens at multiple levels:

1. **User preferences** determine `allowedAppDefaultToolkit`
2. **MCP server configuration** determines `allowedMcpServers`
3. **Model capability check** — some models don't support tool calling at all, so tools are disabled
4. **Mentions in chat** — users can `@webSearch` or `@codeExecutor` to force specific tools

### **7. Model-Specific Tool Support**

Not all models can use tools. Both systems check model capabilities:

**Scira** models are configured with support flags:
```typescript
{
  pro: true,              // Requires Pro subscription
  vision: true,           // Supports image input
  reasoning: true,        // Advanced reasoning
  freeUnlimited: true     // Free tier includes unlimited use
}
```

**Better Chatbot** has an `isToolCallUnsupportedModel()` check:
```typescript
export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};
```

If a model doesn't support tools, the system automatically:
- Disables tool calling
- Shows users a different system prompt explaining tools aren't available
- Tells the model "you cannot use tools with this model"

### **8. Multi-Step Tool Calling & Tool Chaining**

The model can **chain tools together** — use one tool's output as input to another:

In **Scira's extreme search mode**:
```typescript
stopWhen: [stepCountIs(75), hasToolCall('done')],
// Allows up to 75 steps (tool calls) in sequence
```

The model can:
1. Call `web_search` → get results
2. Call `browse_page` on a result → get detailed content
3. Call `code_runner` to analyze that data → get insights
4. Call `done` → finish

Each step passes results forward.

In **Better Chatbot's workflow mode**:
- Tools can be chained visually in a workflow editor
- One tool's output flows into another tool's input
- The model learns to use these workflows

### **9. Streaming vs. Non-Streaming**

- **`streamText()`**: Returns results as they come in real-time, showing the user tool calls as they happen
- **`generateText()`**: Waits for all tool calls to complete, returns final result

**Scira** uses streaming heavily to show users:
- Live tool calls
- Real-time search progress
- Step-by-step research

**Better Chatbot** uses streaming for:
- User-facing chat responses
- Real-time tool execution feedback

### **10. Context & Memory**

The conversation **history** is also sent to the model each time:

```typescript
messages: [
  { role: "user", content: "Search for X" },
  { role: "assistant", content: "Calling web_search..." },
  { role: "tool", content: searchResults },  // Tool result becomes context
  { role: "assistant", content: "Based on the search..." },
  { role: "user", content: "Now search for Y" }
]
```

The model sees **everything** — previous tool calls, results, and its own reasoning — so it can make smarter decisions about which tools to use next.

---

## **Summary: The Complete Flow**

1. **Define**: Create tool functions with schemas (what they do, parameters, outputs)
2. **Register**: Pass tools to AI SDK call (`tools: { ... }`)
3. **Tell**: System prompt instructs model that tools exist
4. **Filter**: Set `activeTools` to limit what's available
5. **Decide**: Model reads prompt + history + tools → decides to call a tool
6. **Execute**: SDK runs the actual tool function
7. **Return**: SDK sends tool result back to model
8. **Loop**: Model can see result and call more tools
9. **Respond**: Model finally outputs text answer to user

The AI model never directly executes code — it just **decides and requests** tool execution. The framework handles everything else.