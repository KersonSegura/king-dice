/**
 * Pass selected image URI from step 1 to step 2 in memory.
 * Route params can truncate long file:// URIs, so the server received 0 bytes.
 */
let _pendingUri: string | null = null;

export function setPendingImageUri(uri: string): void {
  _pendingUri = uri;
}

export function getPendingImageUri(): string | null {
  return _pendingUri;
}

export function clearPendingImageUri(): void {
  _pendingUri = null;
}
