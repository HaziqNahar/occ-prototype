// Grey shimmering placeholders while a page loads, in the shape of what is
// coming, so the layout does not jump.
export function SkeletonRows({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="skeleton-rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div className="skeleton-row" key={row}>
          {Array.from({ length: columns }, (_, column) => <span className="skeleton" key={column} />)}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBlock({ height }: { height: number }) {
  return <div className="skeleton skeleton-block" aria-busy="true" aria-label="Loading" style={{ height }} />
}
