export type NotEmptyString<T extends string> = T extends ""
  ? "Error: String cannot be empty"
  : T;
