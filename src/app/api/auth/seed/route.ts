import { NextResponse } from 'next/server';
import { seedRbac } from '@/lib/rbac';

export async function POST() {
  try {
    await seedRbac();
    return NextResponse.json({ success: true, message: 'RBAC seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}