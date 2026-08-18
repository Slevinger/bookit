"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Minus, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { createRoomAction, updateRoomAction } from "@/lib/actions/rooms";
import { formatBeds, roomCapacity } from "@/lib/domain/room";
import type { Room } from "@/lib/domain/types";
import type { RoomInput } from "@/lib/services/room-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wizard, type WizardStep } from "@/components/wizard";
import { cn } from "@/lib/utils";

interface RoomDraft {
  name: string;
  beds: { double: number; single: number };
  basePrice: string;
  description: string;
}

const emptyDraft: RoomDraft = {
  name: "",
  beds: { double: 1, single: 0 },
  basePrice: "",
  description: "",
};

export function RoomsManager({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [wizard, setWizard] = useState<{ editingId: string | null } | null>(null);

  async function toggleActive(room: Room) {
    const result = await updateRoomAction(room.id, { isActive: !room.isActive });
    if (result.ok) {
      toast.success(room.isActive ? `${room.name} hidden from calendar` : `${room.name} reactivated`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const editingRoom = wizard?.editingId ? rooms.find((r) => r.id === wizard.editingId) : undefined;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <Button size="lg" className="text-base" onClick={() => setWizard({ editingId: null })}>
          <Plus className="size-5" /> Add room
        </Button>
      </div>

      {rooms.length === 0 && (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <BedDouble className="size-10 text-muted-foreground" />
          <p className="text-base text-muted-foreground">No rooms yet.</p>
          <Button size="lg" className="text-base" onClick={() => setWizard({ editingId: null })}>
            <Plus className="size-5" /> Add your first room
          </Button>
        </div>
      )}

      {rooms.map((room) => (
        <div
          key={room.id}
          className={cn(
            "flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm",
            !room.isActive && "opacity-60",
          )}
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BedDouble className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{room.name}</p>
            <p className="flex items-center gap-3 text-base text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-4" /> {formatBeds(room.beds)}
              </span>
              <span>{room.basePrice.toLocaleString()} / night</span>
            </p>
            {room.description && (
              <p className="truncate text-sm text-muted-foreground">{room.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button type="button" onClick={() => toggleActive(room)}>
              <Badge
                variant={room.isActive ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1 text-sm"
              >
                {room.isActive ? "Active" : "Hidden"}
              </Badge>
            </button>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={`Edit ${room.name}`}
              onClick={() => setWizard({ editingId: room.id })}
            >
              <Pencil className="size-5" />
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={wizard !== null} onOpenChange={(open) => !open && setWizard(null)}>
        <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? `Edit ${editingRoom.name}` : "New room"}</DialogTitle>
          </DialogHeader>
          {wizard && (
            <RoomWizard
              key={wizard.editingId ?? "new"}
              room={editingRoom}
              onDone={() => {
                setWizard(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomWizard({ room, onDone }: { room?: Room; onDone: () => void }) {
  const [draft, setDraft] = useState<RoomDraft>(
    room
      ? {
          name: room.name,
          beds: { ...room.beds },
          basePrice: String(room.basePrice),
          description: room.description,
        }
      : emptyDraft,
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const input: RoomInput = {
      name: draft.name,
      beds: draft.beds,
      basePrice: Number(draft.basePrice || 0),
      description: draft.description,
    };
    setSaving(true);
    const result = room ? await updateRoomAction(room.id, input) : await createRoomAction(input);
    setSaving(false);
    if (result.ok) {
      toast.success(room ? "Room updated" : "Room added");
      onDone();
    } else {
      toast.error(result.error);
    }
  }

  const steps: WizardStep[] = [
    {
      id: "name",
      title: "What is the room called?",
      validate: () => (draft.name.trim() ? null : "Please give the room a name."),
      content: (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="room-name" className="text-base">Room name</Label>
            <Input
              id="room-name"
              autoFocus
              className="h-13 text-base"
              placeholder="e.g. Garden room"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room-description" className="text-base">Description (optional)</Label>
            <Input
              id="room-description"
              className="h-13 text-base"
              placeholder="e.g. Double bed, garden view"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
        </div>
      ),
    },
    {
      id: "beds",
      title: "What beds are in the room?",
      validate: () =>
        draft.beds.double + draft.beds.single >= 1 ? null : "The room needs at least one bed.",
      content: (
        <div className="grid gap-6 py-2">
          <BedStepper
            label="Double beds"
            value={draft.beds.double}
            onChange={(double) => setDraft({ ...draft, beds: { ...draft.beds, double } })}
          />
          <BedStepper
            label="Single beds"
            value={draft.beds.single}
            onChange={(single) => setDraft({ ...draft, beds: { ...draft.beds, single } })}
          />
          <p className="text-base text-muted-foreground">
            Sleeps {roomCapacity(draft.beds)} guest{roomCapacity(draft.beds) === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      id: "price",
      title: "Price per night",
      validate: () =>
        draft.basePrice !== "" && Number(draft.basePrice) >= 0 ? null : "Please enter a price.",
      content: (
        <div className="grid gap-2">
          <Label htmlFor="room-price" className="text-base">Standard price per night</Label>
          <Input
            id="room-price"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className="h-14 text-2xl font-semibold"
            placeholder="0"
            value={draft.basePrice}
            onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            You can always adjust the price for each individual booking.
          </p>
        </div>
      ),
    },
    {
      id: "confirm",
      title: "Everything correct?",
      content: (
        <div className="grid gap-3 text-base">
          <SummaryRow label="Name" value={draft.name} />
          {draft.description && <SummaryRow label="Description" value={draft.description} />}
          <SummaryRow label="Beds" value={formatBeds(draft.beds) || "None"} />
          <SummaryRow label="Sleeps" value={String(roomCapacity(draft.beds))} />
          <SummaryRow label="Price / night" value={Number(draft.basePrice || 0).toLocaleString()} />
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      onFinish={save}
      finishLabel={room ? "Save changes" : "Add room"}
      submitting={saving}
    />
  );
}

function BedStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-base">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="size-6" />
        </Button>
        <span
          className="w-10 text-center text-2xl font-bold tabular-nums"
          aria-label={label.toLowerCase()}
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
