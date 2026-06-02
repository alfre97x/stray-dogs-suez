"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/store";
import AddDogDialog from "@/components/AddDogDialog";

// MapLibre touches `window`; load the map only on the client.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!profile) return router.push("/auth?next=/map");
    setAdding(true);
  };

  return (
    <>
      <MapView onAddDog={handleAdd} />
      {adding && <AddDogDialog onClose={() => setAdding(false)} />}
    </>
  );
}
