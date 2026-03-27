
interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return <h2 className="text-xl font-semibold mb-3">{children}</h2>;
}
