import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.narrativeTree.count();
    console.log('Total NarrativeTrees:', count);

    const trees = await prisma.narrativeTree.findMany({
        include: {
            _count: {
                select: { nodes: true }
            }
        }
    });

    console.log(JSON.stringify(trees, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
