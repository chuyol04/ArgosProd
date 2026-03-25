interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`w-full px-10 sm:px-24 lg:px-28 py-2 lg:py-3 ${className}`}>
      {children}
    </div>
  );
}
