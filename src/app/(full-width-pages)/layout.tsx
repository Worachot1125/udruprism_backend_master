// export default function FullWidthPageLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return <div>{children}</div>;
// }

// src/app/(full-width-pages)/layout.tsx
export default function FullWidthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-white dark:bg-gray-900">
      {children}
    </div>
  );
}
