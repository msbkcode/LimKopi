// Shared behaviour for Entity classes.
// Entity methods keep the return types shown in the BCE diagrams (boolean / object / list).
// When the server rejects a request, the reason is stored in `lastError` so the Control
// can pass a meaningful message to the Boundary's DisplayError().
export class EntityBase {
  static lastError = '';
  static lastStatus = 0;

  static async attempt(work, fallback) {
    this.lastError = '';
    this.lastStatus = 0;
    try {
      return await work();
    } catch (error) {
      this.lastError = error.message || 'Unexpected error.';
      this.lastStatus = error.status || 0;
      return fallback;
    }
  }
}
