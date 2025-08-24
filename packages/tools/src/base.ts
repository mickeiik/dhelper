import { z } from 'zod';
import { ResultSchema } from '@app/schemas';

export abstract class Tool<
    TInput extends z.ZodType = z.ZodAny,
    TOutput extends z.ZodType = z.ZodAny
> {
    abstract id: string;
    abstract name: string;
    abstract inputSchema: TInput;
    abstract outputSchema: TOutput;

    // Optional properties that tools commonly implement
    abstract description: string;
    category?: string;
    examples?: unknown;

    // Optional initialization method
    initialize?(context: any): Promise<void>;

    // Create the result schema for this tool
    get resultSchema() {
        return ResultSchema(this.outputSchema);
    }

    async execute(rawInput: unknown): Promise<z.infer<typeof this.resultSchema>> {
        try {
            // Validate input
            const input = this.inputSchema.parse(rawInput);

            // Execute with validated input
            const result = await this.executeValidated(input);

            // Validate and return the result
            return this.resultSchema.parse(result);
        } catch (error) {
            // Return error result
            return this.resultSchema.parse({
                success: false,
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    code: 'TOOL_EXECUTION_ERROR',
                    details: { originalError: error }
                }
            });
        }
    }

    protected abstract executeValidated(
        input: z.infer<TInput>
    ): Promise<z.infer<typeof this.resultSchema>>;
}