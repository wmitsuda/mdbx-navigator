export const DEFAULT_PAGE_SIZE = 25;

export type TableEntry = {
  name: string;
  pageSize: number;
  depth: number;
  branchPages: number;
  leafPages: number;
  overflowPages: number;
  entries: number;
};

export type KV = {
  k: string;
  cappedV: string;
  vLength: number;
  dupIdx: number;
};

export type K = {
  k: string;
  dupIdx: number;
};

export const maxBytesPerLinePerKey = 40;
export const maxBytesPerLinePerValue = 32;
export const groupSize = 8;

export const BACKEND_URL = "http://127.0.0.1:56516/api";
