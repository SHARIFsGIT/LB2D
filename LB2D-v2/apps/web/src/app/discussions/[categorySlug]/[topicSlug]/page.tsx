'use client';

import React from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api/discussions';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { QAStructuredData } from '@/components/seo/QAStructuredData';

export default function TopicPage({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string }>;
}) {
  const { categorySlug, topicSlug } = use(params);
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<string | null>(null);

  // Fetch topic
  const { data: topicData, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', topicSlug],
    queryFn: () => discussionsApi.topics.getOne(topicSlug),
  });

  // Fetch posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['topic-posts', topicData?.data?.data?.id],
    queryFn: () => discussionsApi.posts.getAll(topicData?.data?.data?.id || ''),
    enabled: !!topicData?.data?.data?.id,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      discussionsApi.posts.create(topicData?.data?.data?.id || '', data),
    onSuccess: () => {
      showNotification('success', 'Reply posted successfully!');
      setReplyContent('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['topic-posts'] });
    },
    onError: () => {
      showNotification('error', 'Failed to post reply');
    },
  });

  const topic = topicData?.data?.data;
  const posts = postsData?.data?.data || [];

  if (topicLoading || !topic) {
    return <div className="min-h-screen bg-gray-50 py-12 px-4">Loading...</div>;
  }

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createPostMutation.mutate({ content: replyContent, parentId: replyTo || undefined });
  };

  return (
    <>
      {topic.type === 'QUESTION' && <QAStructuredData topic={topic} />}

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm">
            <a href="/discussions" className="text-green-600 hover:underline">
              Forums
            </a>
            {' > '}
            <a
              href={`/discussions/${categorySlug}`}
              className="text-green-600 hover:underline"
            >
              {topic.category.name}
            </a>
            {' > '}
            <span className="text-gray-600">{topic.title}</span>
          </nav>

          {/* Topic Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-2 mb-3">
              {topic.type === 'QUESTION' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Question
                </span>
              )}
              {topic.isPinned && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Pinned
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{topic.title}</h1>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                {topic.user.firstName[0]}{topic.user.lastName[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {topic.user.firstName} {topic.user.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(topic.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="prose max-w-none mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">{topic.content}</p>
            </div>

            {/* Tags */}
            {topic.tags && topic.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {topic.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500 border-t pt-4">
              <span>{topic.viewCount} views</span>
              <span>{topic.replyCount} replies</span>
              <span>{topic.likeCount} likes</span>
            </div>
          </div>

          {/* Posts/Replies */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold text-gray-900">
              {topic.replyCount} {topic.replyCount === 1 ? 'Reply' : 'Replies'}
            </h2>

            {postsLoading ? (
              <div>Loading replies...</div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No replies yet. Be the first to respond!</p>
              </div>
            ) : (
              posts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  topicId={topic.id}
                  bestAnswerId={topic.bestAnswerId}
                  onReply={() => setReplyTo(post.id)}
                />
              ))
            )}
          </div>

          {/* Reply Form */}
          {user && !topic.isLocked && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Post a Reply</h3>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
              />
              <button
                onClick={handleReply}
                disabled={!replyContent.trim() || createPostMutation.isPending}
                className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createPostMutation.isPending ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          )}

          {topic.isLocked && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">This topic is locked. No new replies can be posted.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PostCard({ post, topicId, bestAnswerId, onReply }: any) {
  const isBestAnswer = post.id === bestAnswerId;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${isBestAnswer ? 'border-green-500 border-2' : 'border-gray-200'}`}>
      {isBestAnswer && (
        <div className="mb-3">
          <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            ✓ Best Answer
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
          {post.user.firstName[0]}{post.user.lastName[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {post.user.firstName} {post.user.lastName}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <p className="text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>

      <div className="flex items-center gap-4 text-sm">
        <button className="text-gray-600 hover:text-green-600 transition-colors">
          👍 Like ({post.likeCount})
        </button>
        <button onClick={onReply} className="text-gray-600 hover:text-green-600 transition-colors">
          Reply
        </button>
      </div>

      {/* Nested Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="ml-8 mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
          {post.replies.map((reply: any) => (
            <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold">
                  {reply.user.firstName[0]}{reply.user.lastName[0]}
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {reply.user.firstName} {reply.user.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(reply.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm text-gray-700">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
