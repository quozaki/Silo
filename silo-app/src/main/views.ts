import { BrowserWindow, WebContentsView, session } from 'electron'

// Track open browser views: envId -> WebContentsView
export const openViews = new Map<string, WebContentsView>()

export function removeViewForPartition(partition: string | null): void {
  if (!partition) return
  for (const [envId, view] of [...openViews.entries()]) {
    try {
      if (view.webContents.session === session.fromPartition(partition)) {
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          try {
            win.contentView.removeChildView(view)
          } catch {
            // already detached
          }
        }
        try {
          view.webContents.close()
        } catch {
          // ignore
        }
        openViews.delete(envId)
      }
    } catch {
      // ignore
    }
  }
  // Fallback: also detach any orphan view whose partition matches but not in map
  // (e.g., view was created but map entry missed)
  const win = BrowserWindow.getAllWindows()[0]
  if (!win || win.isDestroyed()) return
  for (const child of [...win.contentView.children]) {
    try {
      const v = child as WebContentsView
      if ((v.webContents.session as unknown) === session.fromPartition(partition)) {
        try {
          win.contentView.removeChildView(v)
        } catch {}
        try {
          v.webContents.close()
        } catch {}
      }
    } catch {}
  }
}

export function removeViewsForPartitions(partitions: string[]): void {
  for (const p of partitions) removeViewForPartition(p)
}
