export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="neo-card p-8 text-center max-w-lg mx-auto">
      {Icon && (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center border-2 border-neo-line bg-neo-bg shadow-neo-sm">
          <Icon className="h-6 w-6 text-neo-ink" aria-hidden />
        </div>
      )}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="mt-2 text-sm font-medium text-neo-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
