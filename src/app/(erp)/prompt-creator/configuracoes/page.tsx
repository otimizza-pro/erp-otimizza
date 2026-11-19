import {Suspense} from "react";
import {ContentSettingsWorkspace} from "@/components/content-studio/settings-workspace";
export default function ContentSettingsPage(){return <Suspense fallback={<p role="status">Carregando configurações...</p>}><ContentSettingsWorkspace/></Suspense>;}
