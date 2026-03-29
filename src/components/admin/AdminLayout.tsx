import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  GripVertical, Plus, Save, Eye, EyeOff, Trash2, Layers,
  RotateCcw, Settings2, X, LayoutGrid, ChevronUp, ChevronDown, Palette,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LayoutSection, SectionType } from "./layout/types";
import { SECTION_CATALOG, DEFAULT_LAYOUT, sectionLabel, sectionIcon } from "./layout/constants";
import SectionEditor from "./layout/SectionEditor";
import PreviewBlock from "./layout/PreviewBlock";
import AdminTheme from "./AdminTheme";

export type { LayoutSection, SectionType };

/* ─── Sortable Sidebar Item ─── */
function SortableSidebarItem({
  section, isSelected, onSelect, onToggle, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  section: LayoutSection; isSelected: boolean;
  onSelect: () => void; onToggle: () => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-1.5 rounded-lg border p-2 cursor-pointer transition-all ${
        isSelected
          ? "bg-primary/10 border-primary ring-1 ring-primary/30"
          : section.visible
          ? "bg-card border-border hover:border-primary/50"
          : "bg-muted/40 border-dashed border-muted-foreground/30"
      } ${isDragging ? "shadow-lg scale-105" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-primary shrink-0">{sectionIcon(section.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{sectionLabel(section.type)}</p>
        {section.props?.title && (
          <p className="text-[10px] text-muted-foreground truncate">{section.props.title}</p>
        )}
      </div>
      <div className="flex flex-col shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Ghost Overlay Item ─── */
function GhostItem({ section }: { section: LayoutSection }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 p-2.5 shadow-2xl opacity-80 backdrop-blur-sm w-72">
      <GripVertical className="w-4 h-4 text-primary" />
      <span className="text-primary shrink-0">{sectionIcon(section.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary truncate">{sectionLabel(section.type)}</p>
        {section.props?.title && (
          <p className="text-[10px] text-primary/60 truncate">{section.props.title}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
type SidebarTab = "sections" | "edit" | "add";

export default function AdminLayout() {
  const [sections, setSections] = useState<LayoutSection[]>(DEFAULT_LAYOUT);
  const [savedSections, setSavedSections] = useState<LayoutSection[]>(DEFAULT_LAYOUT);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("sections");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [configsOpen, setConfigsOpen] = useState(false);

  const isDirty = JSON.stringify(sections) !== JSON.stringify(savedSections);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "homepage_layout")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const loaded = data.value as unknown as LayoutSection[];
          setSections(loaded);
          setSavedSections(loaded);
        }
        setLoaded(true);
      });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      return arrayMove(prev, idx, target);
    });
  };

  const toggleVisibility = (id: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSectionProps = (id: string, props: Record<string, any>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props } : s)));

  const addSection = (type: SectionType) => {
    const catalog = SECTION_CATALOG.find((s) => s.type === type);
    const newSection: LayoutSection = {
      id: `${type}_${Date.now()}`,
      type,
      visible: true,
      props: catalog?.defaultProps ? { ...catalog.defaultProps } : undefined,
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedId(newSection.id);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "homepage_layout", value: sections as any }, { onConflict: "key" });
    if (error) toast.error("Erro ao salvar layout");
    else {
      setSavedSections([...sections]);
      toast.success("Layout salvo com sucesso!");
    }
    setSaving(false);
  };

  const resetToDefault = () => {
    setSections(DEFAULT_LAYOUT);
    setSelectedId(null);
    toast.info("Layout restaurado ao padrão");
  };

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;
  const activeSection = sections.find((s) => s.id === activeId) ?? null;

  if (!loaded) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando layout...</div>;
  }

  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-4rem)] md:h-screen flex flex-col bg-muted/30 overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground font-heading hidden sm:block">Layout da Página</h2>
          </div>
          {isDirty && (
            <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-medium">
              Alterações não salvas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfigsOpen(true)}
            className="text-xs gap-1.5 h-8"
            title="Configs Gerais"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configs Gerais</span>
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !isDirty}
            className={`text-xs gap-1.5 h-8 transition-all ${isDirty ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "opacity-50"}`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 lg:w-80 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-muted/30 shrink-0">
            {([
              { id: "sections" as SidebarTab, label: "Seções", icon: <Layers className="w-3.5 h-3.5" /> },
              { id: "edit" as SidebarTab, label: "Editar", icon: <Settings2 className="w-3.5 h-3.5" /> },
              { id: "add" as SidebarTab, label: "Adicionar", icon: <Plus className="w-3.5 h-3.5" /> },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setSidebarTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  sidebarTab === t.id
                    ? "border-primary text-primary bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sidebarTab === "sections" && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section, idx) => (
                    <SortableSidebarItem
                      key={section.id}
                      section={section}
                      isSelected={selectedId === section.id}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onSelect={() => {
                        setSelectedId(selectedId === section.id ? null : section.id);
                        if (selectedId !== section.id) setSidebarTab("edit");
                      }}
                      onToggle={() => toggleVisibility(section.id)}
                      onRemove={() => removeSection(section.id)}
                      onMoveUp={() => moveSection(section.id, "up")}
                      onMoveDown={() => moveSection(section.id, "down")}
                    />
                  ))}
                </SortableContext>
                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeSection ? <GhostItem section={activeSection} /> : null}
                </DragOverlay>
              </DndContext>
            )}

            {sidebarTab === "edit" && (
              selectedSection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-primary">{sectionIcon(selectedSection.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{sectionLabel(selectedSection.type)}</p>
                      {selectedSection.props?.title && (
                        <p className="text-[10px] text-muted-foreground truncate">{selectedSection.props.title}</p>
                      )}
                    </div>
                  </div>
                  <SectionEditor
                    section={selectedSection}
                    onUpdateProps={(props) => updateSectionProps(selectedSection.id, props)}
                    onClose={() => setSelectedId(null)}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Settings2 className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">Selecione uma seção para editar</p>
                </div>
              )
            )}

            {sidebarTab === "add" && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground px-1">Clique para adicionar ao final</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {SECTION_CATALOG.map((cat) => (
                    <button
                      key={cat.type}
                      onClick={() => { addSection(cat.type); setSidebarTab("sections"); }}
                      className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <span className="text-primary shrink-0 p-2 rounded-md bg-primary/10">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Preview */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="max-w-4xl mx-auto py-6 px-4 space-y-1">
            <div className="bg-primary/10 rounded-t-lg py-1.5 px-4 flex items-center justify-center">
              <span className="text-[10px] text-primary/60 font-medium">🔒 TopBar — Fixo (editável em Configs Gerais)</span>
            </div>
            <div className="bg-card rounded-lg py-3 px-4 flex items-center justify-center border border-border">
              <span className="text-base font-bold text-primary font-heading tracking-wide">TMTD KIDS</span>
            </div>

            {sections.map((section) => (
              <PreviewBlock
                key={section.id}
                section={section}
                isSelected={selectedId === section.id}
                onClick={() => setSelectedId(selectedId === section.id ? null : section.id)}
              />
            ))}

            {sections.filter((s) => s.visible).length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg py-16 flex flex-col items-center gap-2 text-muted-foreground">
                <Plus className="w-8 h-8" />
                <p className="text-sm">Adicione seções usando o painel à esquerda</p>
              </div>
            )}

            <div className="bg-foreground/5 rounded-b-lg py-4 px-4 flex items-center justify-center border border-border/50">
              <span className="text-[10px] text-muted-foreground font-medium">📦 Footer — Fixo</span>
            </div>
          </div>
        </main>
      </div>

      {/* Configs Gerais Dialog */}
      <Dialog open={configsOpen} onOpenChange={setConfigsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Configs Gerais
            </DialogTitle>
          </DialogHeader>
          <AdminTheme />
          <div className="border-t border-border pt-4 mt-2">
            <Button variant="outline" size="sm" onClick={() => { resetToDefault(); setConfigsOpen(false); }} className="text-xs gap-1.5 text-destructive hover:text-destructive">
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar Layout ao Padrão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
