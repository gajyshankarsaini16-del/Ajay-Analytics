export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formId, data, source = 'public' } = body;

    if (!formId || !data) {
      return NextResponse.json({ error: 'formId and data are required' }, { status: 400 });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        source,
        data: JSON.stringify(data)
      }
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Failed to submit form', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}
