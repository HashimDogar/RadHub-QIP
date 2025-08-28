import React, { useEffect, useMemo, useState } from "react";

type RequestItem = {
  id: string;
  requestedAt: string;           // ISO
  scanType: string;
  outcome: string;
  radiologistComment?: string | null;
  radiologistGmcNumber?: string | null;
};

type ApiResponse = {
  requests: RequestItem[];
};

type Props = {
  className?: string;
  days?: number;                 // default 30
  pageSize?: number;             // default 10
  token?: string;                // optional override; otherwise get from your auth layer
  fetcher?: (input: RequestInfo, init?: RequestInit) => Promise<Response>; // testability
};

const OUTCOME_LABELS: Record<string, string> = {
  accepted: 'Accepted',
  delayed: 'Delayed',
  rejected: 'Rejected',
  info_needed: 'Requires further information'
};

const RecentRequestHistory: React.FC<Props> = ({
  className,
  days = 30,
  pageSize = 10,
  token,
  fetcher
}) => {
  const [data, setData] = useState<RequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.length / pageSize));
  }, [data, pageSize]);

  const pageItems = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Get token from your auth context/store if not passed in.
        const bearer =
          token ||
          (typeof window !== "undefined"
            ? localStorage.getItem("auth_token") || undefined
            : undefined);

        const res = await (fetcher ? fetcher : fetch)(
          `/api/requests?days=${encodeURIComponent(days)}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
            }
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed: ${res.status}`);
        }

        const json: ApiResponse = await res.json();
        const sorted = (json.requests || []).slice().sort((a, b) => {
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        });

        if (isMounted) {
          setData(sorted);
          setPage(1);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load request history.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [days, token, fetcher]);

  return (
    <section
      className={["rh-card", className].filter(Boolean).join(" ")}
      aria-labelledby="recent-request-history-title"
    >
      <div className="rh-card__header">
        <h2 id="recent-request-history-title">Recent Request History</h2>
        <span className="rh-card__sub">Last {days} days</span>
      </div>

      {loading && <div className="rh-state">Loading recent requests…</div>}

      {!loading && error && (
        <div className="rh-state rh-state--error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && data && data.length === 0 && (
        <div className="rh-state">No requests in the last {days} days.</div>
      )}

      {!loading && !error && data && data.length > 0 && (
        <>
          <div className="rh-table" role="table" aria-label="Recent requests">
            <div className="rh-row rh-row--head" role="row">
              <div className="rh-cell rh-cell--date" role="columnheader">Requested</div>
              <div className="rh-cell" role="columnheader">Scan</div>
              <div className="rh-cell" role="columnheader">Outcome</div>
              <div className="rh-cell" role="columnheader">Radiologist Comments</div>
              <div className="rh-cell rh-cell--gmc" role="columnheader">Radiologist GMC</div>
            </div>

            {pageItems.map((r) => (
              <div className="rh-row" role="row" key={r.id}>
                <div className="rh-cell rh-cell--date" role="cell">
                  {new Date(r.requestedAt).toLocaleString()}
                </div>
                <div className="rh-cell" role="cell">{r.scanType || "—"}</div>
                <div className="rh-cell" role="cell">
                  <span className={`rh-badge rh-badge--${(r.outcome || "unknown").toLowerCase()}`}>
                    {OUTCOME_LABELS[r.outcome] || r.outcome || "Unknown"}
                  </span>
                </div>
                <div className="rh-cell" role="cell">
                  {r.radiologistComment?.trim() ? r.radiologistComment : "—"}
                </div>
                <div className="rh-cell rh-cell--gmc" role="cell">
                  {r.radiologistGmcNumber?.trim() ? r.radiologistGmcNumber : "—"}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="rh-pagination" role="navigation" aria-label="Pagination">
              <button
                className="rh-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="rh-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                className="rh-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Minimal component-scoped styles that don't require Tailwind */}
      <style>{`
        .rh-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .rh-card__header {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 12px;
        }
        .rh-card__header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .rh-card__sub {
          color: #6b7280;
          font-size: 12px;
        }
        .rh-state {
          color: #374151;
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }
        .rh-state--error {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }
        .rh-table {
          display: grid;
          gap: 8px;
        }
        .rh-row {
          display: grid;
          grid-template-columns: 180px 1fr 130px 2fr 150px;
          gap: 8px;
          align-items: start;
          padding: 10px 12px;
          border: 1px solid #f3f4f6;
          border-radius: 10px;
        }
        .rh-row--head {
          background: #f9fafb;
          font-weight: 600;
          border-color: #e5e7eb;
        }
        .rh-cell {
          font-size: 14px;
          color: #111827;
          word-break: break-word;
        }
        .rh-cell--date, .rh-cell--gmc {
          white-space: nowrap;
        }
        .rh-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .rh-badge--approved { background: #ecfdf5; border-color: #d1fae5; }
        .rh-badge--rejected { background: #fef2f2; border-color: #fee2e2; }
        .rh-badge--reported { background: #eff6ff; border-color: #dbeafe; }
        .rh-badge--pending  { background: #fff7ed; border-color: #ffedd5; }
        .rh-pagination {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-end;
        }
        .rh-btn {
          border: 1px solid #e5e7eb;
          background: white;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .rh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 860px) {
          .rh-row {
            grid-template-columns: 160px 1fr;
          }
          .rh-row .rh-cell:nth-child(3),
          .rh-row .rh-cell:nth-child(4),
          .rh-row .rh-cell:nth-child(5) {
            grid-column: span 2;
          }
        }
      `}</style>
    </section>
  );
};

export default RecentRequestHistory;