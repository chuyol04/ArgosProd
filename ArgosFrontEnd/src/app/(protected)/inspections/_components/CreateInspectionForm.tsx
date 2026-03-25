"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { IClient } from "@/app/(protected)/clients/types/clients.types";

const formSchema = z.object({
  inspection_date: z.date(),
  mfg_date: z.date(),
  week: z.string(),
  client: z.string(),
  inspectors: z.string(),
  hour_rate: z.number(),
  part_number: z.string(),
  work_order: z.string(),
  serial: z.string(),
  lot: z.string(),
  description: z.string(),
  comments: z.string(),
  worked_hours: z.string(),
  inspected_pieces: z.string(),
  accepted: z.string(),
  rejected: z.string(),
  reworked: z.string(),
});

interface CreateInspectionFormProps {
  clients: IClient[];
}

export function CreateInspectionForm({ clients }: CreateInspectionFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <div className="flex flex-col w-full px-10 py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FormField
              control={form.control}
              name="inspection_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de inspección</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mfg_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Manufactura</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="week" render={({ field }) => (<FormItem><FormLabel>Semana</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="inspectors" render={({ field }) => (<FormItem><FormLabel>Número de inspectores</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="hour_rate" render={({ field }) => (<FormItem><FormLabel>Tasa por Hora</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
          </div>

          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={form.control} name="part_number" render={({ field }) => (<FormItem><FormLabel>Número de parte</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un número de parte" /></SelectTrigger></FormControl><SelectContent>{/* Options */}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="work_order" render={({ field }) => (<FormItem><FormLabel>Instrucción de Trabajo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una IT" /></SelectTrigger></FormControl><SelectContent>{/* Options */}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="serial" render={({ field }) => (<FormItem><FormLabel>Serial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="lot" render={({ field }) => (<FormItem><FormLabel>Lote</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Descripción..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="comments" render={({ field }) => (<FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea placeholder="Comentarios..." {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <FormField control={form.control} name="worked_hours" render={({ field }) => (<FormItem><FormLabel>Horas trabajadas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="inspected_pieces" render={({ field }) => (<FormItem><FormLabel>Piezas inspeccionadas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="accepted" render={({ field }) => (<FormItem><FormLabel>Piezas aceptadas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="rejected" render={({ field }) => (<FormItem><FormLabel>Piezas Rechazadas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="reworked" render={({ field }) => (<FormItem><FormLabel>Piezas Retrabajadas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
