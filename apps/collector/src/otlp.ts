/**
 * Minimal OTLP/HTTP JSON wire types (only the fields Blazo consumes).
 * @see https://opentelemetry.io/docs/specs/otlp/
 */

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values?: OtlpAnyValue[] };
  kvlistValue?: { values?: OtlpKeyValue[] };
  bytesValue?: string;
}

export interface OtlpKeyValue {
  key: string;
  value?: OtlpAnyValue;
}

export interface OtlpStatus {
  code?: number;
  message?: string;
}

export interface OtlpEvent {
  timeUnixNano?: string;
  name?: string;
  attributes?: OtlpKeyValue[];
}

export interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: number;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  attributes?: OtlpKeyValue[];
  events?: OtlpEvent[];
  status?: OtlpStatus;
}

export interface OtlpScopeSpans {
  scope?: { name?: string; version?: string };
  spans?: OtlpSpan[];
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
}

export interface OtlpResourceSpans {
  resource?: OtlpResource;
  scopeSpans?: OtlpScopeSpans[];
}

export interface ExportTraceServiceRequest {
  resourceSpans?: OtlpResourceSpans[];
}

export interface OtlpLogRecord {
  timeUnixNano?: string;
  observedTimeUnixNano?: string;
  severityNumber?: number;
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  traceId?: string;
  spanId?: string;
}

export interface OtlpScopeLogs {
  scope?: { name?: string; version?: string };
  logRecords?: OtlpLogRecord[];
}

export interface OtlpResourceLogs {
  resource?: OtlpResource;
  scopeLogs?: OtlpScopeLogs[];
}

export interface ExportLogsServiceRequest {
  resourceLogs?: OtlpResourceLogs[];
}

/** Recursively decode an OTLP `AnyValue` into a plain JS value. */
export const decodeAnyValue = (value: OtlpAnyValue | undefined): unknown => {
  if (!value) {
    return undefined;
  }
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  if (value.boolValue !== undefined) {
    return value.boolValue;
  }
  if (value.intValue !== undefined) {
    return Number(value.intValue);
  }
  if (value.doubleValue !== undefined) {
    return value.doubleValue;
  }
  if (value.bytesValue !== undefined) {
    return value.bytesValue;
  }
  if (value.arrayValue) {
    return (value.arrayValue.values ?? []).map(decodeAnyValue);
  }
  if (value.kvlistValue) {
    return attributesToObject(value.kvlistValue.values);
  }
  return undefined;
};

/** Decode an OTLP attribute list into a plain object. */
export const attributesToObject = (
  attributes: OtlpKeyValue[] | undefined,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const attribute of attributes ?? []) {
    result[attribute.key] = decodeAnyValue(attribute.value);
  }
  return result;
};

/** Convert an OTLP nanosecond timestamp into epoch milliseconds. */
export const nanosToMillis = (nanos: string | number | undefined): number => {
  if (nanos === undefined) {
    return Date.now();
  }
  return Number(BigInt(nanos) / 1_000_000n);
};
