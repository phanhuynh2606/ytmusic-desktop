import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/adblock")({
	component: AdblockPopupPage,
});

function AdblockPopupPage() {
	const utils = trpc.useUtils();
	const { data: adState, refetch } = trpc.adblock.state.useQuery(undefined, {
		refetchInterval: 1000,
	});

	const { mutateAsync: toggleAdblock, isPending: isToggling } = trpc.adblock.toggle.useMutation({
		onSuccess: (data) => {
			utils.adblock.state.setData(undefined, data);
			void refetch();
		},
	});

	const { mutateAsync: closePopup } = trpc.adblock.closePopup.useMutation();
	const { mutateAsync: reloadPage, isPending: isReloading } = trpc.adblock.reloadPage.useMutation();

	const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null);
	const isEnabled = optimisticEnabled !== null ? optimisticEnabled : (adState?.enabled ?? true);
	const blockedThisPage = adState?.blockedThisPage ?? 0;
	const blockedTotal = adState?.blockedTotal ?? 0;
	const domain = adState?.domain ?? "music.youtube.com";

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				void closePopup();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closePopup]);

	const handleToggle = async () => {
		const targetState = !isEnabled;
		setOptimisticEnabled(targetState);
		try {
			await toggleAdblock();
		} finally {
			setOptimisticEnabled(null);
		}
	};

	return (
		<div className="drag h-screen w-screen p-4 flex flex-col justify-between bg-neutral-950 text-white select-none border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden box-border">
			{/* Header */}
			<div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
				<div className="flex items-center gap-2.5">
					<div
						className={cn(
							"size-7 rounded-lg flex items-center justify-center transition-colors shadow-sm",
							isEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-400",
						)}
					>
						{isEnabled ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
					</div>
					<div>
						<h1 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
							Trình chặn quảng cáo
							<span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
								Cốc Cốc
							</span>
						</h1>
						<p className="text-[10px] text-neutral-400">Adblock Engine</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => void closePopup()}
					className="no-drag size-6 flex items-center justify-center rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
					title="Đóng popup"
				>
					<X className="size-3.5" />
				</button>
			</div>

			{/* Domain & Toggle Switch Card */}
			<div className="no-drag my-2 p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex items-center justify-between gap-2">
				<div className="flex flex-col min-w-0">
					<span className="text-xs font-semibold text-neutral-200 truncate font-mono">{domain}</span>
					<span className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
						<span
							className={cn(
								"size-1.5 rounded-full",
								isEnabled ? "bg-emerald-400 animate-pulse" : "bg-neutral-500",
							)}
						/>
						{isEnabled ? "Đang bảo vệ trên trang này" : "Đã tắt chặn quảng cáo"}
					</span>
				</div>

				{/* Cốc Cốc Style Toggle Switch */}
				<button
					type="button"
					disabled={isToggling}
					onClick={() => void handleToggle()}
					className={cn(
						"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
						isEnabled ? "bg-emerald-500" : "bg-neutral-700",
					)}
					title={isEnabled ? "Tắt chặn quảng cáo" : "Bật chặn quảng cáo"}
				>
					<span
						className={cn(
							"pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
							isEnabled ? "translate-x-5" : "translate-x-0",
						)}
					/>
				</button>
			</div>

			{/* Stats Grid - 2 Columns (on this page & in total) */}
			<div className="no-drag grid grid-cols-2 gap-2 my-1">
				{/* Column 1: On this page */}
				<div className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-center">
					<span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 mb-1">
						Trên trang này
					</span>
					<div
						className={cn(
							"text-2xl font-bold font-mono tracking-tight",
							isEnabled ? "text-emerald-400" : "text-neutral-500",
						)}
					>
						{blockedThisPage.toLocaleString()}
					</div>
					<span className="text-[9px] text-neutral-500 mt-0.5">on this page</span>
				</div>

				{/* Column 2: In total */}
				<div className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-center">
					<span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 mb-1">
						Tổng cộng
					</span>
					<div
						className={cn(
							"text-2xl font-bold font-mono tracking-tight",
							isEnabled ? "text-emerald-300" : "text-neutral-500",
						)}
					>
						{blockedTotal.toLocaleString()}
					</div>
					<span className="text-[9px] text-neutral-500 mt-0.5">in total</span>
				</div>
			</div>

			{/* Quick Actions & Footer */}
			<div className="no-drag pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
					<CheckCircle2 className="size-3 text-emerald-400" />
					<span>Hiệu lực ngay lập tức</span>
				</div>

				<button
					type="button"
					disabled={isReloading}
					onClick={() => void reloadPage()}
					className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors cursor-pointer"
					title="Làm mới trang YouTube Music"
				>
					<RotateCw className={cn("size-3", isReloading && "animate-spin")} />
					<span>Tải lại</span>
				</button>
			</div>
		</div>
	);
}
