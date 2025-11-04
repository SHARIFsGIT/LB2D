'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/common/Button';

interface Video {
  _id: string;
  title: string;
  description: string;
  courseName?: string;
  courseLevel?: string;
  status: 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  duration?: number;
  viewCount?: number;
  rejectionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  commentCount?: number;
  newCommentCount?: number;
  uploadedAt: string;
}

interface Props {
  video: Video;
  onResubmit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, any> = {
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoCard({ video, onResubmit, onDelete }: Props) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-2xl transition-all hover:-translate-y-1">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{video.title}</h4>
          <Badge {...getStatusBadge(video.status)} />
        </div>
        <span className="text-xs bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1 rounded-full ml-2 font-bold">
          #{video.sequenceNumber}
        </span>
      </div>

      {/* Course Info */}
      {video.courseName && (
        <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">{video.courseName}</p>
            {video.courseLevel && <p className="text-xs text-blue-600">Level {video.courseLevel}</p>}
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{video.description}</p>

      {/* Video Stats */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-600">
        {video.duration && (
          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{formatDuration(video.duration)}</span>
          </span>
        )}
        {video.viewCount !== undefined && (
          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="font-medium">{video.viewCount} views</span>
          </span>
        )}
        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-medium">{new Date(video.uploadedAt).toLocaleDateString()}</span>
        </span>
      </div>

      {/* Comments Count with NEW Badge */}
      {video.commentCount !== undefined && (
        <div className="mb-4 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm font-semibold text-purple-800">{video.commentCount} comments</span>
          {video.newCommentCount && video.newCommentCount > 0 && (
            <span className="ml-auto text-xs bg-red-500 text-white px-3 py-1 rounded-full font-bold animate-pulse">
              {video.newCommentCount} NEW
            </span>
          )}
        </div>
      )}

      {/* Rejection Reason */}
      {video.rejectionReason && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="font-bold text-red-900 text-sm mb-1">⚠️ Rejection Reason</p>
              <p className="text-red-800 text-sm">{video.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Status */}
      {video.deletionStatus === 'pending' && (
        <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-bold text-orange-800">Deletion Pending Admin Approval</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        {video.status === 'rejected' && (
          <Button
            onClick={() => onResubmit(video._id)}
            className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700 text-sm font-semibold"
          >
            🔄 Resubmit
          </Button>
        )}

        {video.deletionStatus !== 'pending' && (
          <Button
            onClick={() => onDelete(video._id, video.title)}
            className={`${
              video.status === 'rejected' ? 'flex-1' : 'w-full'
            } bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold`}
          >
            🗑️ Delete
          </Button>
        )}

        {video.status === 'approved' && (
          <Button
            className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold"
          >
            👁️ View Details
          </Button>
        )}
      </div>
    </div>
  );
}
