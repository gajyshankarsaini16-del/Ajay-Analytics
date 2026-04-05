import { prisma } from './lib/prisma';

async function main() {
  try {
    console.log("totalForms...");
    const totalForms = await prisma.form.count();
    console.log("totalForms:", totalForms);

    console.log("submissions...");
    const submissions = await prisma.formSubmission.findMany({
      select: { data: true, submittedAt: true }
    });
    console.log("submissions:", submissions.length);

    console.log("datasets...");
    const datasets = await prisma.dataset.findMany({
      select: { data: true, uploadedAt: true }
    });
    console.log("datasets:", datasets.length);

    console.log("recentForms...");
    const recentForms = await prisma.form.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });
    console.log("recentForms:", recentForms.length);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
