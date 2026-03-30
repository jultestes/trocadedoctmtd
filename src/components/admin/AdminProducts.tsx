import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Upload, Loader2, ChevronDown, Camera, ImageIcon, Images, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import MultiUploadDialog from "@/components/admin/MultiUploadDialog";
import BulkEditDialog from "@/components/admin/BulkEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  old_price: number | null;
  discount: number | null;
  image_url: string | null;
  extra_images: string[];
  category_id: string | null;
  sizes: string[];
  stock: number;
  active: boolean;
};

type Category = {id: string;name: string;};

type GenderType = "menina" | "menino";

const AGE_OPTIONS: Record<GenderType, {value: string;label: string;}[]> = {
  menino: [
  { value: "menino-p", label: "P" },
  { value: "menino-m", label: "M" },
  { value: "menino-g", label: "G" },
  { value: "menino-idade1", label: "1 ano" },
  { value: "menino-idade2", label: "2 anos" },
  { value: "menino-idade3", label: "3 anos" },
  { value: "menino-idade4", label: "4 anos" },
  { value: "menino-idade6", label: "6 anos" },
  { value: "menino-idade8", label: "8 anos" },
  { value: "menino-idade10", label: "10 anos" },
  { value: "menino-idade12", label: "12 anos" },
  { value: "menino-idade14", label: "14 anos" },
  { value: "menino-idade16", label: "16 anos" }],

  menina: [
  { value: "menina-p", label: "P" },
  { value: "menina-m", label: "M" },
  { value: "menina-g", label: "G" },
  { value: "menina-idade1", label: "1 ano" },
  { value: "menina-idade2", label: "2 anos" },
  { value: "menina-idade3", label: "3 anos" },
  { value: "menina-idade4", label: "4 anos" },
  { value: "menina-idade6", label: "6 anos" },
  { value: "menina-idade8", label: "8 anos" },
  { value: "menina-idade10", label: "10 anos" },
  { value: "menina-idade12", label: "12 anos" },
  { value: "menina-idade14", label: "14 anos" },
  { value: "menina-idade16", label: "16 anos" }]

};

type ProductType = "conjunto" | "peca_unica" | "";

const emptyForm = {
  name: "", brand: "", price: "", old_price: "", discount: "",
  image_url: "", category_id: "", sizes: "" as string, stock: "", active: true,
  gender: "" as GenderType | "",
  selectedAges: [] as string[],
  productType: "" as ProductType,
  selectedCategories: [] as string[],
  extra_images: [] as string[]
};

const buildAutoName = (productType: ProductType, gender: GenderType | "") => {
  if (productType !== "conjunto") return "";
  let parts: string[] = ["Conjunto"];
  if (gender === "menina") parts.push("Feminino");else
  if (gender === "menino") parts.push("Masculino");
  return parts.join(" ");
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, string[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [skuSearch, setSkuSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");
  const ITEMS_PER_PAGE = 15;

  const filteredProducts = products.filter((p) => {
    // SKU search
    if (skuSearch.trim()) {
      const sku = (p as any).sku || "";
      if (!sku.toLowerCase().includes(skuSearch.trim().toLowerCase())) return false;
    }
    // Gender filter
    if (filterGender !== "all") {
      const sizes = p.sizes ?? [];
      const hasGender = sizes.some((s) => s.startsWith(filterGender));
      if (!hasGender) return false;
    }
    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active" && !p.active) return false;
      if (filterStatus === "inactive" && p.active) return false;
    }
    // Category filter
    if (filterCategory !== "all") {
      const catIds = productCategoryMap[p.id] || (p.category_id ? [p.category_id] : []);
      if (!catIds.includes(filterCategory)) return false;
    }
    // Age filter
    if (filterAge !== "all") {
      const sizes = p.sizes ?? [];
      if (!sizes.some((s) => s.includes(filterAge))) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters or products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length, skuSearch, filterGender, filterStatus, filterCategory, filterAge]);

  const isSelected = (id: string) => selectedIds.includes(id);

  const handleRowSelect = useCallback((productId: string, index: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      if (shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        const rangeIds = products.slice(start, end + 1).map((p) => p.id);
        const merged = new Set([...prev, ...rangeIds]);
        return Array.from(merged);
      } else {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        } else {
          return [...prev, productId];
        }
      }
    });
    setLastClickedIndex(index);
  }, [lastClickedIndex, products]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.length === products.length) return [];
      return products.map((p) => p.id);
    });
  }, [products]);

  const handleBulkDelete = async () => {
    setShowBulkDeleteDialog(false);
    const ids = [...selectedIds];
    for (const id of ids) {
      const product = products.find((p) => p.id === id);
      // Delete main image
      if (product?.image_url) {
        try {
          const url = new URL(product.image_url);
          const key = url.pathname.replace(/^\//, "");
          if (key) await supabase.functions.invoke("r2-upload?action=delete", { body: { key } });
        } catch (e) {console.warn("Falha ao excluir imagem do R2:", e);}
      }
      // Delete extra images
      for (const extraUrl of product?.extra_images || []) {
        try {
          const url = new URL(extraUrl);
          const key = url.pathname.replace(/^\//, "");
          if (key) await supabase.functions.invoke("r2-upload?action=delete", { body: { key } });
        } catch (e) {console.warn("Falha ao excluir imagem extra do R2:", e);}
      }
    }
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} produto(s) excluído(s)` });
      setSelectedIds([]);
      setLastClickedIndex(null);
      fetchAll();
    }
  };

  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [multiUploading, setMultiUploading] = useState(false);
  const [multiUploadProgress, setMultiUploadProgress] = useState("");
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [showMultiUploadDialog, setShowMultiUploadDialog] = useState(false);
  const [categoryPickerValue, setCategoryPickerValue] = useState<string | undefined>(undefined);
  const [multiItems, setMultiItems] = useState<{
    file: File;
    previewUrl: string;
    name: string;
    selectedAges: string[];
    stock: string;
    ageDropdownOpen: boolean;
    extraFiles: {file: File;previewUrl: string;}[];
    selectedCategories: string[];
    categoryDropdownOpen: boolean;
  }[]>([]);
  // For adding extra images to a single product form
  const [extraImageFiles, setExtraImageFiles] = useState<{file: File;previewUrl: string;}[]>([]);
  const [showExtraUploadDialog, setShowExtraUploadDialog] = useState(false);
  // For adding extra images to a specific multi-item
  const [extraTargetIdx, setExtraTargetIdx] = useState<number | null>(null);
  const [showMultiExtraDialog, setShowMultiExtraDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const ageDropdownRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchAll = async () => {
    const [{ data: prods }, { data: cats }, { data: pcData }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("product_categories").select("product_id, category_id")]
    );
    if (prods) setProducts(prods.map((p) => ({ ...p, extra_images: (p as any).extra_images || [] })));
    if (cats) setCategories(cats);
    if (pcData) {
      const map: Record<string, string[]> = {};
      for (const row of pcData) {
        if (!map[row.product_id]) map[row.product_id] = [];
        map[row.product_id].push(row.category_id);
      }
      setProductCategoryMap(map);
    }
  };

  useEffect(() => {fetchAll();}, []);


  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(e.target as Node)) setAgeDropdownOpen(false);
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) setUploadMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setCategoryPickerValue(undefined);
    setEditingId(null);
    setExtraImageFiles([]);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    const sizes = p.sizes ?? [];
    let gender: GenderType | "" = "";
    if (sizes.some((s) => s.startsWith("menina"))) gender = "menina";else
    if (sizes.some((s) => s.startsWith("menino"))) gender = "menino";
    const isConjunto = p.name.toLowerCase().startsWith("conjunto");

    setForm({
      name: p.name,
      brand: p.brand ?? "",
      price: String(p.price),
      old_price: p.old_price ? String(p.old_price) : "",
      discount: p.discount ? String(p.discount) : "",
      image_url: p.image_url ?? "",
      category_id: p.category_id ?? "",
      sizes: (p.sizes ?? []).join(", "),
      stock: String(p.stock),
      active: p.active,
      gender,
      selectedAges: sizes,
      productType: isConjunto ? "conjunto" : "peca_unica",
      selectedCategories: productCategoryMap[p.id] || (p.category_id ? [p.category_id] : []),
      extra_images: p.extra_images || []
    });
    setCategoryPickerValue(undefined);
    setEditingId(p.id);
    setExtraImageFiles([]);
    setShowForm(true);
  };

  const updateFormField = (updates: Partial<typeof form>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      if (next.productType === "conjunto") {
        next.name = buildAutoName(next.productType, next.gender);
      }
      return next;
    });
  };

  const toggleAge = (ageValue: string) => {
    setForm((prev) => {
      const exists = prev.selectedAges.includes(ageValue);
      const newAges = exists ? prev.selectedAges.filter((a) => a !== ageValue) : [...prev.selectedAges, ageValue];
      const next = { ...prev, selectedAges: newAges };
      if (next.productType === "conjunto") next.name = buildAutoName(next.productType, next.gender);
      return next;
    });
  };

  const getUploadFolder = (): string => {
    const gender = form.gender as GenderType;
    return gender === "menino" ? "menino-estoque" : "menina-estoque";
  };

  const getExtensionFromMime = (mimeType: string): string => {
    const map: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "image/gif": "gif", "image/webp": "webp", "image/heic": "jpg", "image/heif": "jpg"
    };
    return map[mimeType.toLowerCase()] || "jpg";
  };

  /** Upload a file to R2 and return the public URL */
  const uploadFileToR2 = async (file: File, folder: string, customFileName: string): Promise<string> => {
    const properMime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
    const renamedFile = new File([file], customFileName, { type: properMime });
    const formData = new FormData();
    formData.append("file", renamedFile);
    formData.append("folder", folder);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("Sessão expirada. Faça login novamente para enviar imagens.");
    }

    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-upload?action=upload`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

        const isJson = (res.headers.get("content-type") || "").includes("application/json");
        const data = isJson ? await res.json() : { error: await res.text() };

        if (res.ok && data.url) {
          return data.url;
        }

        const errorMessage = data?.error || data?.message || "Falha no upload";
        const isRetriable = [408, 429, 500, 502, 503, 504].includes(res.status);
        const isAuthError = res.status === 401 && /invalid token|unauthorized|jwt/i.test(String(errorMessage));

        if (isAuthError && attempt < maxAttempts) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshed.session?.access_token) {
            accessToken = refreshed.session.access_token;
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
            continue;
          }
        }

        if ((isRetriable || isAuthError) && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }

        throw new Error(errorMessage);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          lastError = new Error("Tempo limite no upload. Tente novamente.");
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
            continue;
          }
          throw lastError;
        }

        if (err instanceof TypeError && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }

        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Falha no upload");
  };

  /** Build a base file name from gender + ages + uuid */
  const buildBaseName = (gender: GenderType, ages: string[], ext: string): {baseName: string;fullName: string;} => {
    const ageKeys = ages.map((a) => a.replace("meninos-", "").replace("menino-", "").replace("menina-", ""));
    const ageSuffix = ageKeys.join("-");
    const uuid = crypto.randomUUID().slice(0, 8);
    const baseName = `${gender}-${ageSuffix}-${uuid}`;
    return { baseName, fullName: `${baseName}.${ext}` };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.gender || form.selectedAges.length === 0) {
      toast({ title: "Selecione gênero e idade antes do upload", variant: "destructive" });
      return;
    }

    const mimeExt = file.type ? getExtensionFromMime(file.type) : null;
    const nameExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
    const ext = mimeExt || nameExt || "jpg";

    setUploading(true);
    try {
      const folder = getUploadFolder();
      const { fullName } = buildBaseName(form.gender as GenderType, form.selectedAges, ext);
      const url = await uploadFileToR2(file, folder, fullName);
      setForm((prev) => ({ ...prev, image_url: url }));
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processMultiFiles(Array.from(files));
    if (multiFileInputRef.current) multiFileInputRef.current.value = "";
  };

  const handleMultiFilesFromDialog = (files: File[]) => {
    processMultiFiles(files);
  };

  const processMultiFiles = (files: File[]) => {
    const items = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: form.productType === "conjunto" ? buildAutoName(form.productType, form.gender) : "",
      selectedAges: [...form.selectedAges],
      stock: form.stock || "0",
      ageDropdownOpen: false,
      extraFiles: [] as {file: File;previewUrl: string;}[],
      selectedCategories: [...form.selectedCategories],
      categoryDropdownOpen: false,
    }));
    setMultiItems(items);
    setMultiFiles(files);
  };

  const removeMultiItem = (index: number) => {
    setMultiItems((prev) => prev.filter((_, i) => i !== index));
    setMultiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMultiItem = (index: number, updates: Partial<typeof multiItems[0]>) => {
    setMultiItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  /** Add extra images to a multi item */
  const addExtraFilesToMultiItem = (idx: number, files: File[]) => {
    setMultiItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const newExtras = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
      return { ...item, extraFiles: [...item.extraFiles, ...newExtras] };
    }));
  };

  const removeExtraFromMultiItem = (itemIdx: number, extraIdx: number) => {
    setMultiItems((prev) => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const updated = [...item.extraFiles];
      URL.revokeObjectURL(updated[extraIdx].previewUrl);
      updated.splice(extraIdx, 1);
      return { ...item, extraFiles: updated };
    }));
  };

  /** Add extra images to single product form */
  const addExtraFilesToForm = (files: File[]) => {
    const newExtras = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setExtraImageFiles((prev) => [...prev, ...newExtras]);
  };

  const removeExtraFromForm = (idx: number) => {
    setExtraImageFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].previewUrl);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const removeExistingExtraImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      extra_images: prev.extra_images.filter((_, i) => i !== idx)
    }));
  };

  const handleMultiUploadConfirm = async () => {
    if (multiItems.length === 0) return;
    if (!form.gender) {
      toast({ title: "Selecione o gênero antes do upload", variant: "destructive" });
      return;
    }
    if (!form.productType) {
      toast({ title: "Selecione o tipo de produto antes do upload", variant: "destructive" });
      return;
    }
    const invalidItems = multiItems.filter((item) => item.selectedAges.length === 0);
    if (invalidItems.length > 0) {
      toast({ title: "Todas as linhas devem ter ao menos uma idade selecionada", variant: "destructive" });
      return;
    }

    setMultiUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < multiItems.length; i++) {
        const item = multiItems[i];
        setMultiUploadProgress(`Enviando ${i + 1} de ${multiItems.length}...`);

        const ext = item.file.type ? getExtensionFromMime(item.file.type) : "jpg";
        const folder = getUploadFolder();
        const gender = form.gender as GenderType;
        const { baseName, fullName } = buildBaseName(gender, item.selectedAges, ext);

        try {
          // Upload main image
          const mainUrl = await uploadFileToR2(item.file, folder, fullName);

          // Upload extra images with suffix
          const extraUrls: string[] = [];
          for (let j = 0; j < item.extraFiles.length; j++) {
            const extraFile = item.extraFiles[j];
            const extraExt = extraFile.file.type ? getExtensionFromMime(extraFile.file.type) : "jpg";
            const extraFileName = `${baseName}_${j + 2}.${extraExt}`;
            const extraUrl = await uploadFileToR2(extraFile.file, folder, extraFileName);
            extraUrls.push(extraUrl);
          }

          const productName = form.productType === "conjunto" ?
          buildAutoName(form.productType, form.gender) :
          item.name;

          const itemCategories = item.selectedCategories.length > 0 ? item.selectedCategories : form.selectedCategories;

          const payload = {
            name: productName.trim() || `Produto ${i + 1}`,
            brand: form.brand.trim() || null,
            price: parseFloat(form.price) || 0,
            old_price: form.old_price ? parseFloat(form.old_price) : null,
            discount: form.discount ? parseInt(form.discount) : 0,
            image_url: mainUrl,
            extra_images: extraUrls,
            category_id: itemCategories[0] || null,
            sizes: item.selectedAges,
            stock: parseInt(item.stock) || 0,
            active: form.active
          };

          const { error, data: insertedData } = await supabase.from("products").insert(payload).select("id").single();
          if (error) throw error;
          if (insertedData && itemCategories.length > 0) {
            await supabase.from("product_categories").insert(
              itemCategories.map((cid) => ({ product_id: insertedData.id, category_id: cid }))
            );
          }
          successCount++;
        } catch (err: any) {
          console.error(`Erro no arquivo ${i + 1}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({ title: `${successCount} produto(s) criado(s) com sucesso!` });
        fetchAll();
        setShowForm(false);
      }
      if (errorCount > 0) {
        toast({ title: `${errorCount} arquivo(s) falharam`, variant: "destructive" });
      }
    } finally {
      setMultiUploading(false);
      setMultiUploadProgress("");
      setMultiFiles([]);
      setMultiItems([]);
    }
  };

  const handleSave = async () => {
    if (!form.productType) {
      toast({ title: "Selecione o tipo de produto", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Nome obrigatório", description: form.productType === "conjunto" ? "Preencha gênero e idade para gerar o nome." : "Digite o nome do produto.", variant: "destructive" });
      return;
    }
    if (form.productType === "conjunto" && (!form.gender || form.selectedAges.length === 0)) {
      toast({ title: "Preencha gênero e idade", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Upload any new extra image files
      const newExtraUrls: string[] = [];
      if (extraImageFiles.length > 0 && form.gender && form.selectedAges.length > 0) {
        const folder = getUploadFolder();
        const gender = form.gender as GenderType;
        // Derive baseName from existing main image URL or generate new
        let baseName: string;
        if (form.image_url) {
          // Extract base from existing URL: folder/baseName.ext -> baseName
          const urlPath = form.image_url.split("/").pop() || "";
          baseName = urlPath.replace(/\.[^.]+$/, "").replace(/_\d+$/, ""); // strip extension and any existing suffix
        } else {
          const ext = "jpg";
          const result = buildBaseName(gender, form.selectedAges, ext);
          baseName = result.baseName;
        }
        const existingCount = form.extra_images.length;
        for (let j = 0; j < extraImageFiles.length; j++) {
          const ef = extraImageFiles[j];
          const ext = ef.file.type ? getExtensionFromMime(ef.file.type) : "jpg";
          const suffix = existingCount + j + 2;
          const fileName = `${baseName}_${suffix}.${ext}`;
          const url = await uploadFileToR2(ef.file, folder, fileName);
          newExtraUrls.push(url);
        }
      }

      const allExtraImages = [...form.extra_images, ...newExtraUrls];

      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        price: parseFloat(form.price) || 0,
        old_price: form.old_price ? parseFloat(form.old_price) : null,
        discount: form.discount ? parseInt(form.discount) : 0,
        image_url: form.image_url.trim() || null,
        extra_images: allExtraImages,
        category_id: form.selectedCategories[0] || null,
        sizes: form.selectedAges,
        stock: parseInt(form.stock) || 0,
        active: form.active
      };

      let error;
      let productId = editingId;
      if (editingId) {
        ({ error } = await supabase.from("products").update(payload).eq("id", editingId));
      } else {
        const { data, error: insertError } = await supabase.from("products").insert(payload).select("id").single();
        error = insertError;
        if (data) productId = data.id;
      }

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else if (productId) {
        await supabase.from("product_categories").delete().eq("product_id", productId);
        if (form.selectedCategories.length > 0) {
          await supabase.from("product_categories").insert(
            form.selectedCategories.map((cid) => ({ product_id: productId!, category_id: cid }))
          );
        }
        setShowForm(false);
        setExtraImageFiles([]);
        fetchAll();
        toast({ title: editingId ? "Produto atualizado!" : "Produto criado!" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const product = products.find((p) => p.id === id);
    if (product?.image_url) {
      try {
        const url = new URL(product.image_url);
        const key = url.pathname.replace(/^\//, "");
        if (key) await supabase.functions.invoke("r2-upload?action=delete", { body: { key } });
      } catch (e) {console.warn("Falha ao excluir imagem do R2:", e);}
    }
    for (const extraUrl of product?.extra_images || []) {
      try {
        const url = new URL(extraUrl);
        const key = url.pathname.replace(/^\//, "");
        if (key) await supabase.functions.invoke("r2-upload?action=delete", { body: { key } });
      } catch (e) {console.warn("Falha ao excluir imagem extra do R2:", e);}
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
      toast({ title: "Produto removido" });
    }
  };

  const getCategoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const getProductCategories = (productId: string) => {
    const catIds = productCategoryMap[productId] || [];
    if (catIds.length === 0) return "—";
    return catIds.map((id) => categories.find((c) => c.id === id)?.name || "?").join(", ");
  };

  const AGE_DISPLAY_FALLBACK: Record<string, string> = {
    p: "P", m: "M", g: "G", rn: "RN",
    idade1: "1 ano", idade2: "2 anos", idade3: "3 anos", idade4: "4 anos",
    idade6: "6 anos", idade8: "8 anos", idade10: "10 anos",
    idade12: "12 anos", idade14: "14 anos", idade16: "16 anos",
  };

  const getAgeLabels = (sizes: string[]) => {
    if (!sizes || sizes.length === 0) return "—";
    const allOptions = [...AGE_OPTIONS.menino, ...AGE_OPTIONS.menina];
    return sizes.map((s) => {
      const match = allOptions.find((o) => o.value === s);
      if (match) return match.label;
      // Fallback: strip gender prefix and lookup
      const stripped = s.replace(/^(menina|menino)-/, "");
      return AGE_DISPLAY_FALLBACK[stripped] || AGE_DISPLAY_FALLBACK[s] || s;
    }).join(", ");
  };

  const currentAgeOptions = form.gender ? AGE_OPTIONS[form.gender as GenderType] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground font-heading">Produtos</h2>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && <>
            <Button variant="outline" size="sm" onClick={() => setShowBulkEditDialog(true)} className="gap-1 text-xs sm:text-sm">
              <Pencil className="w-4 h-4" /> Editar ({selectedIds.length})
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)} className="gap-1 text-xs sm:text-sm">
              <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
            </Button>
          </>
          }
          <Button onClick={openNew} className="gap-1 text-xs sm:text-sm"><Plus className="w-4 h-4" /> Novo</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {(skuSearch || filterGender !== "all" || filterStatus !== "all" || filterCategory !== "all" || filterAge !== "all") && (
            <button
              onClick={() => { setSkuSearch(""); setFilterGender("all"); setFilterStatus("all"); setFilterCategory("all"); setFilterAge("all"); }}
              className="text-xs text-primary hover:underline ml-auto"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU..."
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
          >
            <option value="all">Gênero</option>
            <option value="menina">Menina</option>
            <option value="menino">Menino</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[110px]"
          >
            <option value="all">Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[130px] max-w-[180px] truncate"
          >
            <option value="all">Categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[110px]"
          >
            <option value="all">Idade</option>
            <option value="p">P</option>
            <option value="m">M</option>
            <option value="g">G</option>
            <option value="idade1">1 ano</option>
            <option value="idade2">2 anos</option>
            <option value="idade3">3 anos</option>
            <option value="idade4">4 anos</option>
            <option value="idade6">6 anos</option>
            <option value="idade8">8 anos</option>
            <option value="idade10">10 anos</option>
            <option value="idade12">12 anos</option>
            <option value="idade14">14 anos</option>
            <option value="idade16">16 anos</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{filteredProducts.length} produto(s) encontrado(s)</p>
      </div>


      {showForm &&
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">{editingId ? "Editar Produto" : "Novo Produto"}</h3>
            <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Product type selector */}
            <select
            value={form.productType}
            onChange={(e) => updateFormField({ productType: e.target.value as ProductType, name: e.target.value === "peca_unica" ? "" : form.name })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium">
            
              <option value="">Tipo de produto *</option>
              <option value="conjunto">CONJUNTO</option>
              <option value="peca_unica">PEÇA ÚNICA</option>
            </select>

            {form.productType === "peca_unica" &&
          <Input placeholder="Nome do produto *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          }
            {form.productType === "conjunto" &&
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                {form.name || <span className="text-muted-foreground">Nome automático (preencha gênero e idade)</span>}
              </div>
          }

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Preço *" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input placeholder="Preço antigo" type="number" step="0.01" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} />
            </div>
            <Input placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />

            {/* Gender select */}
            <select
            value={form.gender}
            onChange={(e) => updateFormField({ gender: e.target.value as GenderType | "", selectedAges: [] })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            
              <option value="">Selecione o gênero</option>
              <option value="menina">Menina</option>
              <option value="menino">Menino</option>
            </select>

            {/* Multi-select age dropdown */}
            <div className="relative" ref={ageDropdownRef}>
              <button
              type="button"
              onClick={() => form.gender && setAgeDropdownOpen(!ageDropdownOpen)}
              disabled={!form.gender}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              
                <span className={form.selectedAges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                  {form.selectedAges.length === 0 ? "Selecione as idades" : `${form.selectedAges.length} idade(s)`}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {ageDropdownOpen && currentAgeOptions.length > 0 &&
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
                  {currentAgeOptions.map((opt) =>
              <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm text-foreground">
                      <input type="checkbox" checked={form.selectedAges.includes(opt.value)} onChange={() => toggleAge(opt.value)} className="rounded" />
                      {opt.label}
                    </label>
              )}
                </div>
            }
            </div>

            {/* Category multi-select dropdown */}
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">Categorias</label>
              <Select
              value={categoryPickerValue}
              onValueChange={(value) => {
                if (form.selectedCategories.includes(value)) return;
                setForm((prev) => ({ ...prev, selectedCategories: [...prev.selectedCategories, value] }));
                setCategoryPickerValue(undefined);
              }}>
              
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => !form.selectedCategories.includes(c.id)).map((c) =>
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                )}
                </SelectContent>
              </Select>
              {form.selectedCategories.length > 0 &&
            <div className="flex flex-wrap gap-2">
                  {form.selectedCategories.map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                if (!category) return null;
                return (
                  <button key={categoryId} type="button"
                  onClick={() => setForm((prev) => ({ ...prev, selectedCategories: prev.selectedCategories.filter((id) => id !== categoryId) }))}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent">
                    
                        {category.name} <X className="h-3 w-3" />
                      </button>);

              })}
                </div>
            }
            </div>

            {/* Image upload */}
            <div className="flex flex-col gap-2 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                <input ref={multiFileInputRef} type="file" accept="image/*" multiple onChange={handleMultiFileSelect} className="hidden" />
                <div className="relative" ref={uploadMenuRef}>
                  <Button type="button" variant="outline"
                onClick={() => !uploading && !multiUploading && setUploadMenuOpen(!uploadMenuOpen)}
                disabled={uploading || multiUploading} className="gap-2 text-xs sm:text-sm">
                  
                    {uploading || multiUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {multiUploading ? multiUploadProgress : uploading ? "Enviando..." : "Upload"}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  {uploadMenuOpen &&
                <div className="absolute z-50 mt-1 w-52 rounded-md border border-border bg-popover shadow-md">
                      <button type="button" onClick={() => {setUploadMenuOpen(false);fileInputRef.current?.click();}}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent cursor-pointer rounded-t-md">
                        <ImageIcon className="w-4 h-4" /> Galeria
                      </button>
                      <button type="button" onClick={() => {setUploadMenuOpen(false);cameraInputRef.current?.click();}}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent cursor-pointer">
                        <Camera className="w-4 h-4" /> Câmera
                      </button>
                      <div className="border-t border-border" />
                      <button type="button" onClick={() => {setUploadMenuOpen(false);setShowMultiUploadDialog(true);}}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent cursor-pointer rounded-b-md font-medium">
                        <Images className="w-4 h-4" /> Selecionar Múltiplos
                      </button>
                    </div>
                }
                </div>
                {/* Main image + extras inline */}
                {form.image_url &&
              <div className="flex items-center gap-2 flex-wrap">
                    <img src={form.image_url} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-border" />
                    {form.extra_images.map((url, idx) =>
                <div key={`existing-${idx}`} className="relative group">
                        <img src={url} alt={`Extra ${idx + 1}`} className="w-10 h-10 rounded-lg object-cover border border-border" />
                        <button type="button" onClick={() => removeExistingExtraImage(idx)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                )}
                    {extraImageFiles.map((ef, idx) =>
                <div key={`new-${idx}`} className="relative group">
                        <img src={ef.previewUrl} alt={`Nova ${idx + 1}`} className="w-10 h-10 rounded-lg object-cover border-2 border-primary/50" />
                        <button type="button" onClick={() => removeExtraFromForm(idx)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                )}
                    <button
                  type="button"
                  onClick={() => setShowExtraUploadDialog(true)}
                  className="w-10 h-10 rounded-lg border-dashed border-border hover:border-primary/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border-4"
                  title="Adicionar foto extra">
                  
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
              }
              </div>

              {/* Multi-file editable preview */}
              {multiItems.length > 0 &&
            <div className="mt-3 space-y-3 col-span-1 sm:col-span-2">
                  <p className="text-sm font-semibold text-foreground">Revise cada produto antes de criar:</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {multiItems.map((item, idx) => {
                  const itemAgeOptions = form.gender ? AGE_OPTIONS[form.gender as GenderType] : [];
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 relative group/row">
                          <button type="button" onClick={() => removeMultiItem(idx)}
                            className="absolute top-2 right-2 w-7 h-7 sm:w-6 sm:h-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all duration-150 opacity-80 group-hover/row:opacity-100"
                            title="Remover produto">
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <div className="flex-shrink-0 space-y-1">
                            <img src={item.previewUrl} alt={`Preview ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                            {/* Extra image thumbnails */}
                            <div className="flex gap-1 flex-wrap">
                              {item.extraFiles.map((ef, eIdx) =>
                          <div key={eIdx} className="relative group">
                                  <img src={ef.previewUrl} alt={`Extra ${eIdx + 1}`} className="w-8 h-8 rounded object-cover border border-primary/50" />
                                  <button type="button" onClick={() => removeExtraFromMultiItem(idx, eIdx)}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[7px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    ×
                                  </button>
                                </div>
                          )}
                              <button type="button"
                          onClick={() => {setExtraTargetIdx(idx);setShowMultiExtraDialog(true);}}
                          className="w-8 h-8 rounded border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                          title="Adicionar foto extra">
                            
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 min-w-0">
                            {form.productType === "peca_unica" &&
                        <Input placeholder="Nome *" value={item.name} onChange={(e) => updateMultiItem(idx, { name: e.target.value })} className="text-xs h-8" />
                        }
                            {form.productType === "conjunto" &&
                        <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-2 text-xs text-muted-foreground truncate">
                                {item.name || "Conjunto"}
                              </div>
                        }
                            <div className="relative">
                              <button type="button" onClick={() => updateMultiItem(idx, { ageDropdownOpen: !item.ageDropdownOpen })}
                          className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs">
                                <span className={item.selectedAges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                                  {item.selectedAges.length === 0 ? "Idades" : `${item.selectedAges.length} idade(s)`}
                                </span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </button>
                              {item.ageDropdownOpen && itemAgeOptions.length > 0 &&
                          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                                  {itemAgeOptions.map((opt) =>
                            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer text-xs text-foreground">
                                      <input type="checkbox" checked={item.selectedAges.includes(opt.value)}
                              onChange={() => {
                                const exists = item.selectedAges.includes(opt.value);
                                const newAges = exists ? item.selectedAges.filter((a) => a !== opt.value) : [...item.selectedAges, opt.value];
                                updateMultiItem(idx, { selectedAges: newAges });
                              }} className="rounded" />
                                      {opt.label}
                                    </label>
                            )}
                                </div>
                          }
                            </div>
                            {/* Category picker per item */}
                            <div className="relative">
                              <button type="button" onClick={() => updateMultiItem(idx, { categoryDropdownOpen: !item.categoryDropdownOpen })}
                          className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs">
                                <span className={item.selectedCategories.length === 0 ? "text-muted-foreground" : "text-foreground truncate"}>
                                  {item.selectedCategories.length === 0 ? "Categorias" : item.selectedCategories.map((id) => categories.find((c) => c.id === id)?.name || "?").join(", ")}
                                </span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                              </button>
                              {item.categoryDropdownOpen &&
                          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                                  {categories.map((cat) =>
                            <label key={cat.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer text-xs text-foreground">
                                      <input type="checkbox" checked={item.selectedCategories.includes(cat.id)}
                              onChange={() => {
                                const exists = item.selectedCategories.includes(cat.id);
                                const newCats = exists ? item.selectedCategories.filter((c) => c !== cat.id) : [...item.selectedCategories, cat.id];
                                updateMultiItem(idx, { selectedCategories: newCats });
                              }} className="rounded" />
                                      {cat.name}
                                    </label>
                            )}
                                </div>
                          }
                            </div>
                            <Input placeholder="Estoque" type="number" value={item.stock} onChange={(e) => updateMultiItem(idx, { stock: e.target.value })} className="text-xs h-8" />
                          </div>
                        </div>);

                })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{multiItems.length} produto(s)</span>
                    <Button type="button" size="sm" onClick={handleMultiUploadConfirm} disabled={multiUploading} className="gap-1 text-xs h-7">
                      {multiUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {multiUploading ? multiUploadProgress : "Criar todos"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {setMultiFiles([]);setMultiItems([]);}} disabled={multiUploading} className="text-xs h-7">
                      Limpar
                    </Button>
                  </div>
                </div>
            }
              {form.gender && form.selectedAges.length > 0 &&
            <p className="text-xs text-muted-foreground break-all">📁 {getUploadFolder()}</p>
            }
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${form.active ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${form.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                {form.active && <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="hidden" />
              <div className="flex flex-col">
                <span className={`font-semibold text-sm ${form.active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {form.active ? '✓ Produto Ativo' : 'Produto Inativo'}
                </span>
                <span className="text-xs text-muted-foreground">{form.active ? 'Visível no site' : 'Não aparece no site'}</span>
              </div>
            </label>
            <Button onClick={handleSave} disabled={uploading} className="text-xs sm:text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      }

      {/* Desktop Table */}
      <div className="hidden sm:block bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 w-14 text-center">
                <Checkbox
                  className="h-5 w-5 border-2 border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  checked={products.length > 0 && selectedIds.length === products.length}
                  onCheckedChange={toggleSelectAll} />
                
              </th>
              <th className="p-3 font-medium text-muted-foreground">SKU</th>
              <th className="p-3 font-medium text-muted-foreground">Produto</th>
              <th className="p-3 font-medium text-muted-foreground">Categoria</th>
              <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">Idades</th>
              <th className="p-3 font-medium text-muted-foreground">Preço</th>
              <th className="p-3 font-medium text-muted-foreground">Estoque</th>
              <th className="p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p, idx) =>
            <tr key={p.id} className={`border-b border-border last:border-0 ${isSelected(p.id) ? "bg-primary/5" : ""}`}>
                <td className="p-3 text-center align-middle">
                  <Checkbox
                  className="h-5 w-5 border-2 border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  checked={isSelected(p.id)}
                  onCheckedChange={() => {}}
                   onClick={(e) => handleRowSelect(p.id, (currentPage - 1) * ITEMS_PER_PAGE + idx, (e as React.MouseEvent).shiftKey)} />
                
                </td>
                <td className="p-3 text-xs font-mono text-muted-foreground">{(p as any).sku || "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image_url &&
                  <div className="relative">
                        <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        {p.extra_images.length > 0 &&
                    <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            +{p.extra_images.length}
                          </span>
                    }
                      </div>
                  }
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{getProductCategories(p.id)}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground text-xs max-w-[200px] truncate">{getAgeLabels(p.sizes)}</td>
                <td className="p-3 text-foreground font-medium">R$ {Number(p.price).toFixed(2).replace(".", ",")}</td>
                <td className={`p-3 font-medium ${p.stock < 5 ? "text-destructive" : "text-foreground"}`}>{p.stock}</td>
                <td className="p-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            )}
            {products.length === 0 &&
            <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado</td></tr>
            }
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {paginatedProducts.map((p, idx) =>
        <div key={p.id} className={`bg-card rounded-xl border border-border p-4 ${isSelected(p.id) ? "ring-2 ring-primary/50" : ""}`}>
            <div className="flex items-start gap-3">
              <Checkbox
              className="mt-1 h-5 w-5 flex-shrink-0 border-2 border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              checked={isSelected(p.id)}
              onCheckedChange={() => {}}
              onClick={(e) => handleRowSelect(p.id, (currentPage - 1) * ITEMS_PER_PAGE + idx, (e as React.MouseEvent).shiftKey)} />
            
              {p.image_url &&
            <div className="relative flex-shrink-0">
                  <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
                  {p.extra_images.length > 0 &&
              <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      +{p.extra_images.length}
                    </span>
              }
                </div>
            }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{p.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">SKU: {(p as any).sku || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${p.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="font-semibold text-foreground">R$ {Number(p.price).toFixed(2).replace(".", ",")}</span>
                  <span className={`${p.stock < 5 ? "text-destructive" : "text-muted-foreground"}`}>Est: {p.stock}</span>
                  <span className="text-muted-foreground truncate">{getProductCategories(p.id)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="gap-1 text-xs h-8">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="gap-1 text-xs h-8 text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </div>
          </div>
        )}
        {products.length === 0 &&
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            Nenhum produto cadastrado
          </div>
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
          <span className="text-sm text-muted-foreground">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, products.length)} de {products.length} produtos
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {(() => {
              let start = Math.max(1, currentPage - 1);
              let end = Math.min(totalPages, start + 2);
              start = Math.max(1, end - 2);
              return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ));
            })()}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Single delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja apagar este produto? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} produto(s)</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {selectedIds.length} produto(s) selecionado(s)? As imagens também serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir {selectedIds.length} produto(s)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Multi upload dialog - for bulk product creation */}
      <MultiUploadDialog
        open={showMultiUploadDialog}
        onOpenChange={setShowMultiUploadDialog}
        onFilesSelected={handleMultiFilesFromDialog} />
      

      {/* Extra image upload dialog - for single product form */}
      <MultiUploadDialog
        open={showExtraUploadDialog}
        onOpenChange={setShowExtraUploadDialog}
        onFilesSelected={(files) => addExtraFilesToForm(files)} />
      

      {/* Extra image upload dialog - for a specific multi-item */}
      <MultiUploadDialog
        open={showMultiExtraDialog}
        onOpenChange={setShowMultiExtraDialog}
        onFilesSelected={(files) => {
          if (extraTargetIdx !== null) {
            addExtraFilesToMultiItem(extraTargetIdx, files);
          }
          setExtraTargetIdx(null);
        }} />
      
    </div>);

};

export default AdminProducts;