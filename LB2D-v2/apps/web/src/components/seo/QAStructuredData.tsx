import React from 'react';

interface QAStructuredDataProps {
  topic: {
    title: string;
    content: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    };
    posts: Array<{
      id: string;
      content: string;
      createdAt: string;
      likeCount: number;
      user: {
        firstName: string;
        lastName: string;
      };
    }>;
    bestAnswerId?: string;
  };
}

export function QAStructuredData({ topic }: QAStructuredDataProps) {
  const bestAnswer = topic.bestAnswerId
    ? topic.posts.find(p => p.id === topic.bestAnswerId)
    : topic.posts[0]; // Use first answer if no best answer

  if (!bestAnswer) return null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: topic.title,
      text: topic.content,
      answerCount: topic.posts.length,
      dateCreated: topic.createdAt,
      author: {
        '@type': 'Person',
        name: `${topic.user.firstName} ${topic.user.lastName}`,
      },
      ...(bestAnswer && {
        acceptedAnswer: {
          '@type': 'Answer',
          text: bestAnswer.content,
          dateCreated: bestAnswer.createdAt,
          upvoteCount: bestAnswer.likeCount,
          author: {
            '@type': 'Person',
            name: `${bestAnswer.user.firstName} ${bestAnswer.user.lastName}`,
          },
        },
      }),
      suggestedAnswer: topic.posts.slice(0, 5).filter(p => p.id !== bestAnswer.id).map(post => ({
        '@type': 'Answer',
        text: post.content,
        dateCreated: post.createdAt,
        upvoteCount: post.likeCount,
        author: {
          '@type': 'Person',
          name: `${post.user.firstName} ${post.user.lastName}`,
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
