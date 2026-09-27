/**
 * Identifiers are opaque strings at runtime, but branded at the type level so
 * unrelated identifiers cannot be mixed up by accident.
 */
export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type RunId = Brand<string, "RunId">;
export type SpanId = Brand<string, "SpanId">;
export type LogId = Brand<string, "LogId">;
export type ErrorId = Brand<string, "ErrorId">;
export type FindingId = Brand<string, "FindingId">;

/** Cast a plain string to a branded identifier at a trust boundary. */
export const asRunId = (value: string): RunId => value as RunId;
export const asSpanId = (value: string): SpanId => value as SpanId;
export const asLogId = (value: string): LogId => value as LogId;
export const asErrorId = (value: string): ErrorId => value as ErrorId;
export const asFindingId = (value: string): FindingId => value as FindingId;
