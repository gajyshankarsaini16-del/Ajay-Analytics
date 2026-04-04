export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { formId: string } }) {
  try {
    const submissions = await prisma.formSubmission.findMany({
      where: { formId: params.formId },
      orderBy: { submittedAt: 'desc' }
    });
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Failed to fetch submissions', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
