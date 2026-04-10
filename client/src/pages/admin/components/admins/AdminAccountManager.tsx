import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, Edit2, Trash2, UserX, UserCheck, KeyRound,
  Shield, MoreHorizontal, Filter, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { mockAdmins, roleColors, roleDescriptions, type AdminAccount, type AdminRole } from "./mockData";
import { PageHeaderSkeleton, AdminAccountManagerSkeleton } from "@/components/PageLoadingSkeletons";

const allRoles: AdminRole[] = ["Super Admin", "Operations Admin", "Content Admin", "Reports Admin"];

const AdminAccountManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminAccount[]>(mockAdmins);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AdminRole>("Content Admin");

  // Reset PW
  const [resetPwResult, setResetPwResult] = useState<{ name: string; email: string } | null>(null);

  const filtered = useMemo(() => {
    let result = [...admins];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") result = result.filter(a => a.role === roleFilter);
    if (statusFilter !== "all") result = result.filter(a => a.status === statusFilter);
    return result;
  }, [admins, search, roleFilter, statusFilter]);

  const openEditor = (admin?: AdminAccount) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormName(admin.fullName); setFormEmail(admin.email); setFormRole(admin.role);
    } else {
      setEditingAdmin(null);
      setFormName(""); setFormEmail(""); setFormRole("Content Admin");
    }
    setEditorOpen(true);
  };

  const saveAdmin = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Please fill in all fields"); return;
    }
    if (editingAdmin) {
      setAdmins(prev => prev.map(a => a.id === editingAdmin.id
        ? { ...a, fullName: formName, email: formEmail, role: formRole }
        : a
      ));
      toast.success("Admin account updated");
    } else {
      const username = formName.toLowerCase().split(" ").filter(w => w.length > 2).map(w => w[0]).join("") + "." + (formName.split(" ").pop()?.toLowerCase() || "admin");
      const newAdmin: AdminAccount = {
        id: `adm-${Date.now()}`, fullName: formName, username, email: formEmail,
        role: formRole, lastLogin: "Never", status: "Active", isSelf: false,
      };
      setAdmins(prev => [...prev, newAdmin]);
      toast.success(`Admin created. Temporary password sent to ${formEmail}`);
    }
    setEditorOpen(false);
  };

  const toggleStatus = (admin: AdminAccount) => {
    const newStatus = admin.status === "Active" ? "Deactivated" : "Active";
    setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, status: newStatus } : a));
    toast.success(`${admin.fullName} ${newStatus === "Active" ? "reactivated" : "deactivated"}`);
  };

  const resetPassword = (admin: AdminAccount) => {
    setResetPwResult({ name: admin.fullName, email: admin.email });
  };

  const deleteAdmin = () => {
    if (!deleteTarget) return;
    setAdmins(prev => prev.filter(a => a.id !== deleteTarget.id));
    toast.success(`${deleteTarget.fullName} deleted`);
    setDeleteTarget(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <AdminAccountManagerSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Admin Account Manager</h1>
              <p className="text-sm text-muted-foreground">Create and manage admin accounts with role-based access control.</p>
            </div>
          </div>
          <Button onClick={() => openEditor()} className="gap-2 shadow-sm"><Plus className="w-4 h-4" /> Add Admin</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {allRoles.map(role => {
          const count = admins.filter(a => a.role === role).length;
          const rc = roleColors[role];
          return (
            <Tooltip key={role}>
              <TooltipTrigger asChild>
                <div className="bg-card border border-border rounded-xl p-4 cursor-default">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${rc.bg} flex items-center justify-center`}>
                      <Shield className={`w-4 h-4 ${rc.text}`} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium truncate">{role}</span>
                  </div>
                  <p className="text-2xl font-bold font-display">{count}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">{roleDescriptions[role]}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px] bg-background text-xs">
                <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No admin accounts found.</TableCell></TableRow>
              ) : filtered.map(a => {
                const rc = roleColors[a.role];
                return (
                  <TableRow key={a.id} className="group">
                    <TableCell>
                      <div>
                        <span className="font-medium">{a.fullName}</span>
                        {a.isSelf && <span className="text-xs text-primary ml-2">(You)</span>}
                        <p className="text-xs text-muted-foreground">@{a.username}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${rc.bg} ${rc.text} ${rc.border}`}>{a.role}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{a.lastLogin}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={a.status === "Active"
                        ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                      }>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditor(a)}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(a)}><KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(a)}>
                            {a.status === "Active" ? <><UserX className="w-3.5 h-3.5 mr-2" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5 mr-2" /> Reactivate</>}
                          </DropdownMenuItem>
                          {!a.isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteTarget(a)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Edit Admin Account" : "Add New Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Maria Santos" />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="e.g. m.santos@candelaria.gov.ph" />
            </div>
            <div className="space-y-2">
              <Label>Assigned Role</Label>
              <Select value={formRole} onValueChange={v => setFormRole(v as AdminRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allRoles.map(r => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <span>{r}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleDescriptions[formRole]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveAdmin}>{editingAdmin ? "Save Changes" : "Create Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.fullName}</strong>'s admin account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <Dialog open={!!resetPwResult} onOpenChange={() => setResetPwResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A new temporary password has been generated and sent to <strong>{resetPwResult?.email}</strong> for <strong>{resetPwResult?.name}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">The admin will be required to change their password on next login.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetPwResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountManager;
