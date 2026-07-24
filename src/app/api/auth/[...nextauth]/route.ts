// Auth disabled — stub handlers to prevent 500 errors
export async function GET() {
  return new Response(JSON.stringify({ message: 'Auth disabled' }), { status: 200 });
}
export async function POST() {
  return new Response(JSON.stringify({ message: 'Auth disabled' }), { status: 200 });
}
