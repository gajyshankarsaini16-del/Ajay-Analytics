export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });
    return NextResponse.json(forms);
  } catch (error) {
    console.error('Failed to fetch forms', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, fields } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const form = await prisma.form.create({
      data: {
        title,
        description,
        fields: {
          create: (fields || []).map((field: any, index: number) => ({
            type: field.type,
            label: field.label,
            required: field.required || false,
            options: field.options ? JSON.stringify(field.options) : null,
            logic: field.logic || null,
            validation: field.validation || null,
            order: index
          }))
        }
      },
      include: {
        fields: true
      }
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    console.error('Failed to create form', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
