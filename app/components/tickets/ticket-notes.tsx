import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  User,
  Clock,
  Send,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

interface TicketNote {
  id: string;
  note: string;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    role: string;
  };
}

interface TicketNotesProps {
  ticketId: string;
  currentUserId: string;
  currentUserRole: string;
  className?: string;
}

export function TicketNotes({ 
  ticketId, 
  currentUserId, 
  currentUserRole, 
  className 
}: TicketNotesProps) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  const notesFetcher = useFetcher();
  const addNoteFetcher = useFetcher();
  const deleteNoteFetcher = useFetcher();

  // Load notes when component mounts
  useEffect(() => {
    notesFetcher.load(`/api/tickets/${ticketId}/notes`);
  }, [ticketId]);

  // Update notes when data is loaded
  useEffect(() => {
    if (notesFetcher.data && typeof notesFetcher.data === 'object' && 'notes' in notesFetcher.data) {
      setNotes(notesFetcher.data.notes as TicketNote[]);
    }
  }, [notesFetcher.data]);

  // Handle add note completion
  useEffect(() => {
    if (addNoteFetcher.data && typeof addNoteFetcher.data === 'object' && 'success' in addNoteFetcher.data && addNoteFetcher.data.success) {
      setNewNote("");
      setIsAddingNote(false);
      // Refresh notes
      notesFetcher.load(`/api/tickets/${ticketId}/notes`);
    }
  }, [addNoteFetcher.data, ticketId]);

  // Handle delete note completion
  useEffect(() => {
    if (deleteNoteFetcher.data && typeof deleteNoteFetcher.data === 'object' && 'success' in deleteNoteFetcher.data && deleteNoteFetcher.data.success) {
      // Refresh notes
      notesFetcher.load(`/api/tickets/${ticketId}/notes`);
    }
  }, [deleteNoteFetcher.data, ticketId]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const formData = new FormData();
    formData.append("note", newNote.trim());

    addNoteFetcher.submit(formData, {
      method: "POST",
      action: `/api/tickets/${ticketId}/notes`
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    const formData = new FormData();
    formData.append("noteId", noteId);

    deleteNoteFetcher.submit(formData, {
      method: "DELETE",
      action: `/api/tickets/${ticketId}/notes`
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800';
      case 'MARKETING': return 'bg-green-100 text-green-800';
      case 'HR': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canDeleteNote = (note: TicketNote) => {
    return note.employee.id === currentUserId || currentUserRole === 'ADMIN';
  };

  const isLoading = notesFetcher.state === "loading";
  const isSubmitting = addNoteFetcher.state === "submitting";
  const isDeleting = deleteNoteFetcher.state === "submitting";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Notes & Comments
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notes.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNote(!isAddingNote)}
            disabled={isSubmitting}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Note
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Note Form */}
        {isAddingNote && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a note or comment..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {newNote.length}/1000 characters
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNote("");
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notes yet</p>
            <p className="text-sm text-gray-400">Add the first note to start documenting this ticket</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  isDeleting ? "opacity-50" : ""
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{note.employee.name}</span>
                        <Badge className={cn("text-xs", getRoleBadgeColor(note.employee.role))}>
                          {note.employee.role}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                          locale: id
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {canDeleteNote(note) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeleting}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="ml-11">
                  <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}