import * as React from "react"
import { Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TimePickerProps {
    value?: string // HH:mm format
    onChange?: (time: string) => void
    className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = React.useState(false)

    // Parse value
    const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0]

    const hoursList = Array.from({ length: 24 }, (_, i) => i)
    const minutesList = Array.from({ length: 60 }, (_, i) => i)

    const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
        let newHours = hours
        let newMinutes = minutes

        if (type === 'hour') newHours = val
        if (type === 'minute') newMinutes = val

        onChange?.(`${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`)
    }

    // Scroll to selected time on open
    const hoursRef = React.useRef<HTMLDivElement>(null)
    const minutesRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (open) {
            const selectedHour = hoursRef.current?.querySelector(`[data-value="${hours}"]`)
            const selectedMinute = minutesRef.current?.querySelector(`[data-value="${minutes}"]`)

            if (selectedHour) selectedHour.scrollIntoView({ block: 'center' })
            if (selectedMinute) selectedMinute.scrollIntoView({ block: 'center' })
        }
    }, [open, hours, minutes])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {value ? value : "Pick a time"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex h-64">
                    <div className="flex flex-col border-r">
                        <div className="p-2 text-xs font-medium text-center border-b bg-muted">Hrs</div>
                        <div ref={hoursRef} className="flex-1 overflow-y-auto w-16 p-0 scrollbar-hide dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                            {hoursList.map((h) => (
                                <div
                                    key={h}
                                    data-value={h}
                                    className={cn(
                                        "cursor-pointer px-4 py-2 text-sm text-center hover:bg-accent hover:text-accent-foreground",
                                        hours === h && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                    )}
                                    onClick={() => handleTimeChange('hour', h)}
                                >
                                    {h.toString().padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <div className="p-2 text-xs font-medium text-center border-b bg-muted">Min</div>
                        <div ref={minutesRef} className="flex-1 overflow-y-auto w-16 p-0 scrollbar-hide dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                            {minutesList.map((m) => (
                                <div
                                    key={m}
                                    data-value={m}
                                    className={cn(
                                        "cursor-pointer px-4 py-2 text-sm text-center hover:bg-accent hover:text-accent-foreground",
                                        minutes === m && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                    )}
                                    onClick={() => handleTimeChange('minute', m)}
                                >
                                    {m.toString().padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                </div >
            </PopoverContent >
        </Popover >
    )
}
