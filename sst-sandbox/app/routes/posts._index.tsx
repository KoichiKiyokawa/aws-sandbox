import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "~/lib/db.server";

const loader = (async () => {
  const posts = await prisma.post.findMany();
  return { posts };
}) satisfies LoaderFunction;

export default function PostIndexPage() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
}
