import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, Copy, ShieldCheck, AlertTriangle } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClubLogo, CategoryBadge } from "@/components/clubs/ClubBits";

export default function SuperAdmin() {
  const { data, loading, reload } = useFetch("/admin/clubs");
  const { data: stats } = useFetch("/stats");
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(null);

  const reset = async (admin) => {
    if (!confirm(`Generate a new temporary password for ${admin.email}? Their current password stops working.`)) return;
    setBusy(admin._id);
    try {
      const { data: res } = await api.post(`/admin/admins/${admin._id}/reset-password`);
      setIssued(res);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page space-y-6">
      <div>
        <p className="eyebrow">Super admin</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">Clubs and admins</h1>
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(stats.stats).map(([k, v]) => (
            <div key={k} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="font-display text-2xl font-extrabold">{v}</div>
              <div className="text-xs capitalize text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {loading && !data ? (
          <Skeleton className="m-4 h-64" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="hidden sm:table-cell">Applications</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clubs.map((c) =>
                (c.admins.length ? c.admins : [null]).map((a, i) => (
                  <TableRow key={`${c._id}-${a?._id || i}`}>
                    <TableCell>
                      <Link to={`/clubs/${c.slug}`} className="flex items-center gap-3 hover:text-primary">
                        <ClubLogo club={c} className="h-9 w-9" />
                        <span className="font-medium">{c.shortName || c.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <CategoryBadge category={c.category} />
                    </TableCell>
                    <TableCell>
                      {a ? (
                        <div>
                          <div className="text-sm">{a.email}</div>
                          {a.mustChangePassword ? (
                            <Badge variant="warning">Temporary password</Badge>
                          ) : (
                            <Badge variant="success">
                              <ShieldCheck /> Active since {formatDate(a.updatedAt)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No admin</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{c.applications}</TableCell>
                    <TableCell className="text-right">
                      {a && (
                        <Button size="sm" variant="outline" onClick={() => reset(a)} loading={busy === a._id}>
                          <KeyRound /> Reset password
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(issued)} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New temporary password</DialogTitle>
            <DialogDescription>{issued?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border bg-secondary/50 p-3 font-mono text-lg">
            <span className="flex-1 select-all">{issued?.password}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(`${issued.email} / ${issued.password}`).then(() => toast.success("Copied."))}
              aria-label="Copy"
            >
              <Copy />
            </Button>
          </div>
          <p className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This is shown only once. It isn't stored anywhere in plain text.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
