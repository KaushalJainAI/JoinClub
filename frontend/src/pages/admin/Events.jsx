import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Trash2, CalendarPlus, CalendarX2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard, EmptyState } from "@/components/clubs/ClubBits";

const TYPES = ["workshop", "competition", "performance", "talk", "social", "fest"];
const blank = { title: "", description: "", date: "", time: "17:00", venue: "PEC Campus", type: "workshop" };

export default function Events() {
  const { user } = useSelector((s) => s.auth);
  const slug = user.club?.slug;
  const { data, reload } = useFetch(slug ? `/events?club=${slug}` : null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { time, ...rest } = form;
      // Times are entered in India time.
      const { data: res } = await api.post("/events", { ...rest, date: `${form.date}T${time}:00+05:30` });
      toast.success(res.message);
      setForm(blank);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this event?")) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success("Event removed.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="page grid gap-8 lg:grid-cols-[380px_1fr]">
      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" /> Add an event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <Field label="Title" htmlFor="t">
              <Input id="t" value={form.title} onChange={set("title")} required minLength={3} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="d">
                <Input id="d" type="date" value={form.date} onChange={set("date")} required />
              </Field>
              <Field label="Time (IST)" htmlFor="tm">
                <Input id="tm" type="time" value={form.time} onChange={set("time")} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Venue" htmlFor="v">
                <Input id="v" value={form.venue} onChange={set("venue")} />
              </Field>
              <Field label="Type" htmlFor="ty">
                <Select id="ty" value={form.type} onChange={set("type")} className="capitalize">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description" htmlFor="desc">
              <Textarea id="desc" value={form.description} onChange={set("description")} rows={3} />
            </Field>
            <Button type="submit" className="w-full" loading={busy}>
              Add event
            </Button>
          </form>
        </CardContent>
      </Card>
      <div>
        <p className="eyebrow">Calendar</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">Your upcoming events</h1>
        <p className="text-sm text-muted-foreground">Shown on your club page and the campus events calendar.</p>
        <div className="mt-6 space-y-3">
          {data?.events?.length ? (
            data.events.map((e) => (
              <div key={e._id} className="flex items-start gap-2">
                <div className="flex-1">
                  <EventCard event={e} showClub={false} />
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(e._id)} aria-label="Remove event">
                  <Trash2 />
                </Button>
              </div>
            ))
          ) : (
            <EmptyState icon={CalendarX2} title="No upcoming events">
              Add your orientation, workshops and flagship events so students can show up.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
