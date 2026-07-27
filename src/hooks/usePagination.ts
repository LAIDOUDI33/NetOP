'use client';
import { useState, useMemo } from 'react';

interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  paginatedData: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  pageSize: number;
}

export function usePagination<T>({ data, pageSize = 10, initialPage = 1 }: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset to page 1 if current page exceeds total
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  return {
    paginatedData,
    currentPage: safePage,
    totalPages,
    totalItems: data.length,
    setCurrentPage: (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages))),
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
    pageSize,
  };
}
