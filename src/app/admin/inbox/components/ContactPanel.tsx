"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/config";
import type { Conversation } from "../hooks/useConversations";

interface ContactPanelProps {
  conversation: Conversation | null;
  onUpdated: () => void;
}

export function ContactPanel({ conversation, onUpdated }: ContactPanelProps) {
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm text-muted-foreground">Contact details</p>
        <p className="text-xs text-muted-foreground/60">
          Select a conversation to see who you&apos;re talking to
        </p>
      </div>
    );
  }

  const loadUsers = async () => {
    if (loaded) return;
    const data = await apiFetch<Array<{ id: string; name: string }>>("/users");
    setUsers(data);
    setLoaded(true);
  };

  const updateConversation = async (data: { status?: string; assignedToId?: string | null }) => {
    await apiFetch(`/conversations/${conversation.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    onUpdated();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h3 className="font-semibold">Contact</h3>
      <div className="mt-4 flex justify-center">
        <Avatar className="h-20 w-20 ring-2 ring-border ring-offset-2 ring-offset-transparent">
          {conversation.contact?.avatarUrl ? (
            <AvatarImage
              src={conversation.contact.avatarUrl}
              alt={conversation.contact?.name || "Contact"}
            />
          ) : null}
          <AvatarFallback className="text-xl">
            {(conversation.contact?.name || conversation.contact?.phone || "?")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div className="glass-tile rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="mt-0.5 truncate font-medium">{conversation.contact?.name || "—"}</p>
        </div>
        <div className="glass-tile rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="mt-0.5 truncate font-medium">{conversation.contact?.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["open", "pending", "resolved"] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={conversation.status === status ? "default" : "outline"}
                onClick={() => updateConversation({ status })}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Assign to</p>
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={loadUsers}>
            {conversation.assignedTo?.name || "Assign agent"}
          </Button>
          {users.length > 0 ? (
            <div className="mt-2 space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => updateConversation({ assignedToId: u.id })}
                >
                  {u.name}
                </button>
              ))}
              <button
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                onClick={() => updateConversation({ assignedToId: null })}
              >
                Unassign
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
