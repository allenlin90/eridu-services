export class TaskValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'TaskValidationError';
  }
}
