/**
 * Branded identifiers.
 *
 * @module
 */

/**
 * Identifiers are opaque strings at runtime, but branded at the type level so
 * unrelated identifiers cannot be mixed up by accident.
 *
 * @typeParam T - Underlying primitive (usually `string`).
 * @typeParam Name - Unique brand name, e.g. `"RunId"`.
 *
 * @example
 * type UserId = Brand<string, "UserId">;
 */
export type Brand<T, Name extends string> = T & { readonly __brand: Name };

/** Branded identifier for a {@link Run}. */
export type RunId = Brand<string, "RunId">;
/** Branded identifier for a {@link Span}. */
export type SpanId = Brand<string, "SpanId">;
/** Branded identifier for a {@link Log}. */
export type LogId = Brand<string, "LogId">;
/** Branded identifier for a {@link BlazoError}. */
export type ErrorId = Brand<string, "ErrorId">;
/** Branded identifier for a {@link Finding}. */
export type FindingId = Brand<string, "FindingId">;

/**
 * Cast a plain string to a branded identifier at a trust boundary.
 *
 * @param value - Raw identifier coming from storage or the network.
 * @returns The same value typed as a {@link RunId}.
 *
 * @example
 * const id = asRunId(req.params.id);
 */
export const asRunId = (value: string): RunId => value as RunId;
/**
 * Cast a plain string to a branded {@link SpanId}.
 *
 * @param value - Raw identifier.
 * @returns The value typed as a {@link SpanId}.
 */
export const asSpanId = (value: string): SpanId => value as SpanId;
/**
 * Cast a plain string to a branded {@link LogId}.
 *
 * @param value - Raw identifier.
 * @returns The value typed as a {@link LogId}.
 */
export const asLogId = (value: string): LogId => value as LogId;
/**
 * Cast a plain string to a branded {@link ErrorId}.
 *
 * @param value - Raw identifier.
 * @returns The value typed as a {@link ErrorId}.
 */
export const asErrorId = (value: string): ErrorId => value as ErrorId;
/**
 * Cast a plain string to a branded {@link FindingId}.
 *
 * @param value - Raw identifier.
 * @returns The value typed as a {@link FindingId}.
 */
export const asFindingId = (value: string): FindingId => value as FindingId;
