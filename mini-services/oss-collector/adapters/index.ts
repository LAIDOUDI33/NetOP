// ============================================================================
// oss-collector — Adapter Registry
// ============================================================================

import type { OssAdapter, VendorType } from '../types';
import { HuaweiAdapter } from './huawei';
import { NokiaAdapter } from './nokia';
import { ZteAdapter } from './zte';
import { EricssonAdapter } from './ericsson';
import { SamsungAdapter } from './samsung';

const adapters: Record<VendorType, OssAdapter> = {
  huawei: new HuaweiAdapter(),
  nokia: new NokiaAdapter(),
  zte: new ZteAdapter(),
  ericsson: new EricssonAdapter(),
  samsung: new SamsungAdapter(),
};

export function getAdapter(vendor: VendorType): OssAdapter {
  const adapter = adapters[vendor];
  if (!adapter) {
    throw new Error(`No adapter registered for vendor: ${vendor}`);
  }
  return adapter;
}

export function getAllAdapters(): Record<VendorType, OssAdapter> {
  return adapters;
}
