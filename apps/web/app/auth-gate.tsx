"use client";
import {useEffect} from "react";
import {usePathname,useRouter} from "next/navigation";
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
export default function AuthGate({children}:{children:React.ReactNode}){const path=usePathname();const router=useRouter();useEffect(()=>{const original=window.fetch.bind(window);window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const headers=new Headers(init?.headers);const response=await original(input,{...init,headers,credentials:"include"});if(response.status===401&&path!=="/login")router.replace("/login");return response};return()=>{window.fetch=original}},[path,router]);return <>{children}</>}