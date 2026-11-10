import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Calendar,
  GraduationCap,
  HeartHandshake,
  Sparkles,
  UserCog,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { RouteError } from "@/components/RouteError";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { ResponsiblesEditor } from "@/components/responsibilities/ResponsiblesEditor";
import {
  campusCellsLeaderAssignableIds,
  campusCoursesLeaderAssignableIds,
  campusEventProducerAssignableIds,
  canManageResponsibles,
  useMe,
} from "@/lib/api/auth";
import {
  useAssignCampusCellsLeader,
  useCampusCellsLeaders,
  useRemoveCampusCellsLeader,
} from "@/lib/api/cells";
import {
  MINISTRY_LABEL,
  useCampuses,
  useMinistryGeneralLeaderships,
  type MinistryKind,
} from "@/lib/api/ministries";
import {
  useCampusAreaLeaders,
  useChurchAreaLeaders,
  useMinistryKindLeaders,
  type ChurchArea,
} from "@/lib/api/responsibilities";
import { useChurches } from "@/lib/api/seasons";

export const Route = createFileRoute("/app/responsaveis")({
  head: () => ({ meta: [{ title: "Responsáveis — Redis" }] }),
  component: ResponsiblesPage,
  errorComponent: RouteError,
});

const MINISTRY_KINDS = Object.keys(MINISTRY_LABEL) as MinistryKind[];

// Access hierarchy in one place: the manager chooses the general (church-wide)
// responsibles of each area; campus leaders — or the area's general responsible —
// appoint that area's responsibles at each campus.
function ResponsiblesPage() {
  const { data: me } = useMe();
  const { data: churches } = useChurches();
  const [pickedChurch, setPickedChurch] = useState("");
  // Usually a single church; a picker only shows up when there are several.
  const churchId = pickedChurch || churches?.[0]?.id;

  if (me && !canManageResponsibles(me)) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        Você não tem permissão para definir responsáveis.
      </div>
    );
  }

  const isManager = !!me?.is_manager;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <DetailHeader
        backTo="/app"
        backLabel="Dashboard"
        icon={<UserCog className="h-6 w-6" />}
        title="Responsáveis"
        subtitle="Cada nível escolhe o de baixo: a instituição escolhe os responsáveis gerais, e o líder de campus (ou o responsável geral da área) define os responsáveis de cada campus."
      />

      <DetailSection title="Responsáveis gerais (todos os campi)">
        {(churches?.length ?? 0) > 1 && (
          <div className="mb-4 space-y-1.5">
            <Label>Igreja</Label>
            <Select value={churchId} onValueChange={setPickedChurch}>
              <SelectTrigger className="sm:w-64" aria-label="Igreja">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {churches!.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!isManager && (
          <p className="mb-3 text-sm text-muted-foreground">
            Só os líderes da instituição escolhem os responsáveis gerais.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChurchAreaCard
            churchId={churchId}
            area="cells"
            icon={<Sparkles className="h-4 w-4" />}
            title="Células"
            roleLabel="responsável geral pelas células"
            canEdit={isManager}
          />
          <ChurchAreaCard
            churchId={churchId}
            area="courses"
            icon={<GraduationCap className="h-4 w-4" />}
            title="Cursos"
            roleLabel="responsável geral pelos cursos"
            canEdit={isManager}
          />
          <ChurchAreaCard
            churchId={churchId}
            area="events"
            icon={<Calendar className="h-4 w-4" />}
            title="Produtores de eventos"
            roleLabel="produtor geral de eventos"
            canEdit={isManager}
          />
        </div>
        <MinistryGeneralLeaders churchId={churchId} canEdit={isManager} />
      </DetailSection>

      <CampusResponsibles />
    </div>
  );
}

function AreaCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card data-testid={`area-card-${title}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChurchAreaCard(props: {
  churchId: string | undefined;
  area: ChurchArea;
  icon: ReactNode;
  title: string;
  roleLabel: string;
  canEdit: boolean;
}) {
  const { list, add, remove } = useChurchAreaLeaders(props.churchId, props.area);
  return (
    <AreaCard icon={props.icon} title={props.title}>
      <ResponsiblesEditor
        responsibles={list.data}
        searchEndpoint={`/api/churches/${props.churchId}/people-search/`}
        add={add}
        remove={remove}
        canEdit={props.canEdit && !!props.churchId}
        roleLabel={props.roleLabel}
      />
    </AreaCard>
  );
}

function MinistryGeneralLeaders({ churchId, canEdit }: { churchId?: string; canEdit: boolean }) {
  const { data: generalLeaderships } = useMinistryGeneralLeaderships();
  const [kind, setKind] = useState<MinistryKind>("jovens");
  const { add, remove } = useMinistryKindLeaders(kind);
  const leaders = generalLeaderships?.find((g) => g.kind === kind)?.leaders ?? [];

  return (
    <div className="mt-4">
      <AreaCard icon={<HeartHandshake className="h-4 w-4" />} title="Líderes gerais de ministério">
        <p className="mb-3 text-sm text-muted-foreground">
          Gerenciam o ministério em todos os campi: lideranças locais, eventos e membros.
        </p>
        <div className="mb-3 space-y-1.5">
          <Label>Ministério</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as MinistryKind)}>
            <SelectTrigger className="sm:w-64" aria-label="Ministério">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINISTRY_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {MINISTRY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ResponsiblesEditor
          responsibles={leaders.map((person) => ({ person }))}
          searchEndpoint={`/api/churches/${churchId}/people-search/`}
          add={add}
          remove={remove}
          canEdit={canEdit && !!churchId}
          roleLabel={`líder geral de ${MINISTRY_LABEL[kind]}`}
          emptyText={`Nenhum líder geral de ${MINISTRY_LABEL[kind]}.`}
        />
      </AreaCard>
    </div>
  );
}

// --- Per-campus responsibles ----------------------------------------------------------

function CampusResponsibles() {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const cellsIds = campusCellsLeaderAssignableIds(me);
  const coursesIds = campusCoursesLeaderAssignableIds(me);
  const eventsIds = campusEventProducerAssignableIds(me);
  const canAt = (ids: Set<string> | null, campusId: string) => ids === null || ids.has(campusId);

  // Only campuses where the user can appoint something.
  const options = (campuses ?? []).filter(
    (c) => canAt(cellsIds, c.id) || canAt(coursesIds, c.id) || canAt(eventsIds, c.id),
  );
  const [picked, setPicked] = useState("");
  const campusId = picked || options[0]?.id || "";

  return (
    <DetailSection title="Responsáveis por campus">
      {options.length === 0 ? (
        <EmptyState>Você não define responsáveis em nenhum campus.</EmptyState>
      ) : (
        <>
          <div className="mb-4 space-y-1.5">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Campus
            </Label>
            <Select value={campusId} onValueChange={setPicked}>
              <SelectTrigger className="sm:w-64" aria-label="Campus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CampusCellsCard campusId={campusId} canEdit={canAt(cellsIds, campusId)} />
            <CampusAreaCard
              campusId={campusId}
              area="courses"
              canEdit={canAt(coursesIds, campusId)}
            />
            <CampusAreaCard
              campusId={campusId}
              area="events"
              canEdit={canAt(eventsIds, campusId)}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Os líderes de cada ministério do campus são definidos na página do ministério.
          </p>
        </>
      )}
    </DetailSection>
  );
}

function CampusCellsCard({ campusId, canEdit }: { campusId: string; canEdit: boolean }) {
  const { data } = useCampusCellsLeaders(campusId);
  const add = useAssignCampusCellsLeader(campusId);
  const remove = useRemoveCampusCellsLeader(campusId);
  return (
    <AreaCard icon={<Sparkles className="h-4 w-4" />} title="Células">
      <ResponsiblesEditor
        responsibles={data?.map(({ person, role }) => ({ person, role }))}
        searchEndpoint={`/api/campuses/${campusId}/people-search/`}
        add={{
          isPending: add.isPending,
          mutate: (input, opts) =>
            add.mutate({ person_id: input.person_id, role: input.role ?? "leader" }, opts),
        }}
        remove={remove}
        withRole
        canEdit={canEdit}
        roleLabel="responsável pelas células"
      />
    </AreaCard>
  );
}

function CampusAreaCard({
  campusId,
  area,
  canEdit,
}: {
  campusId: string;
  area: "courses" | "events";
  canEdit: boolean;
}) {
  const { list, add, remove } = useCampusAreaLeaders(campusId, area);
  const isCourses = area === "courses";
  return (
    <AreaCard
      icon={isCourses ? <GraduationCap className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
      title={isCourses ? "Cursos" : "Produtores de eventos"}
    >
      <ResponsiblesEditor
        responsibles={list.data}
        searchEndpoint={`/api/campuses/${campusId}/people-search/`}
        add={add}
        remove={remove}
        withRole={isCourses}
        canEdit={canEdit}
        roleLabel={isCourses ? "responsável pelos cursos" : "produtor de eventos"}
      />
    </AreaCard>
  );
}
