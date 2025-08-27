import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

const calculatorTool = tool({
  name: 'Calculator',
  description: 'Use this tool to answer questions about math problems.',
  parameters: z.object({ question: z.string() }),
  execute: async ({ question }) => {
    // Simple calculator that evaluates basic math expressions
    try {
      // Remove any non-math characters for safety
      const sanitized = question.replace(/[^0-9+\-*/.() ]/g, '');

      // Basic math evaluation - in production, use a proper math library
      const result = Function(`"use strict"; return (${sanitized})`)();

      return `The answer to "${question}" is ${result}`;
    } catch (error) {
      return `I couldn't solve that math problem. Please provide a simple arithmetic expression.`;
    }
  },
});

const agent = new Agent({
  name: 'Strict tool user',
  instructions: 'Always answer using the calculator tool.',
  tools: [calculatorTool],
  modelSettings: { toolChoice: 'auto' },
});
