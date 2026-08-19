"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { GameProduct, formatPlanDuration } from "./GameCard";
import { Flame, SlidersHorizontal, Search, Zap, Download, CheckCircle2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface NewGamesFeedProps {
  games: GameProduct[];
  onBuyNow?: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
  onBack?: () => void;
}

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+";

/**
 * FeedCard — Isolated card for GAMES MPYA ONLY.
 * Uses a vertical stacked footer to prevent price/button overflow in 2-column grids.
 * DO NOT reuse in other views.
 */
function FeedCard({
  game,
  isUnlocked,
  onBuyNow,
}: {
  game: GameProduct;
  isUnlocked: boolean;
  onBuyNow?: (game: GameProduct) => void;
  index: number;
}) {
  const isFree = game.price === 0;
  const showUnlocked = isUnlocked || isFree;
  const rawDuration =
    game.access_duration ||
    game.license_duration ||
    (game as any).plan_duration ||
    (game as any).duration_days ||
    (game as any).duration;
  const durationLabel = formatPlanDuration(rawDuration, isFree);
  const isTopRated = (game.rating || 0) >= 4.5;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuyNow) onBuyNow(game);
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#0F172A] border ${
        showUnlocked
          ? "border-emerald-500/50"
          : "border-slate-800/80 hover:border-blue-600/60"
      } shadow-xl transition-all duration-300 h-full`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 shrink-0">
        <Image
          src={game.cover_image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f"}
          alt={game.title}
          fill
          quality={90}
          unoptimized={Boolean(
            game.cover_image &&
              (game.cover_image.includes("ibb.co") || game.cover_image.includes("unsplash.com"))
          )}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out select-none"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/10 to-transparent opacity-90" />

        {/* Top badge */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          {showUnlocked ? (
            <span className="px-1.5 py-0.5 rounded-lg bg-emerald-600 text-[8px] font-black uppercase text-white border border-emerald-400 flex items-center gap-0.5 shadow-md">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              {isFree ? "FREE" : "UNLOCKED"}
            </span>
          ) : isTopRated ? (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-slate-950/90 text-[9px] font-black text-amber-400 border border-slate-800 shadow-sm backdrop-blur-md">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{game.rating || 4.5}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1.5 bg-[#0F172A]">
        {/* Title */}
        <Link href={`/games/${game.id}`} className="block" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-[11px] sm:text-xs font-black text-white hover:text-blue-400 transition-colors line-clamp-1 tracking-tight leading-snug">
            {game.title}
          </h3>
        </Link>

        {/* Description */}
        {game.description && (
          <p className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-normal">
            {game.description}
          </p>
        )}

        {/* Footer: Vertical Stack — ISOLATED FIX FOR 2-COLUMN OVERLAP */}
        <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-slate-800/80 w-full">
          {/* Row 1: Duration label + Price */}
          <div className="flex items-center justify-between w-full gap-1 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-black text-purple-400 uppercase tracking-wider leading-none truncate flex-1 min-w-0">
              {durationLabel}
            </span>
            {showUnlocked ? (
              <span className="text-[10px] font-black text-emerald-400 tracking-wide uppercase shrink-0">
                {isFree ? "FREE" : "UNLOCKED"}
              </span>
            ) : (
              <span className="text-[11px] sm:text-xs font-black text-white leading-none shrink-0">
                {formatCurrency(game.price)}
              </span>
            )}
          </div>

          {/* Row 2: Full-width action button */}
          <button
            onClick={handleClick}
            className={`w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer touch-manipulation ${
              showUnlocked
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
            } text-white`}
          >
            {showUnlocked ? (
              <>
                <Download className="w-3.5 h-3.5 text-white shrink-0" />
                <span>{isFree ? "DOWNLOAD" : "PAKUA GAME"}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-white shrink-0" />
                <span>NUNUA GAME</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewGamesFeed({
  games = [],
  onBuyNow,
  unlockedGameIds = new Set(),
  onBack,
}: NewGamesFeedProps) {
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "price-asc" | "price-desc">("newest");
  const [search, setSearch] = useState("");

  const liveGames = useMemo(() => {
    const safeList = Array.isArray(games) ? games : [];
    return safeList.filter((g) => {
      if (!g) return false;
      const status = String(g.status || "").toLowerCase();
      if (status === "draft" || status === "archived" || status === "hidden") return false;
      if ((g as any).is_active === false) return false;
      return true;
    });
  }, [games]);

  const filteredAndSortedGames = useMemo(() => {
    let list = [...liveGames];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          String(g?.title || "").toLowerCase().includes(q) ||
          String(g?.category || "").toLowerCase().includes(q) ||
          String(g?.description || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "price-asc") return (a?.price || 0) - (b?.price || 0);
      if (sortBy === "price-desc") return (b?.price || 0) - (a?.price || 0);
      if (sortBy === "rating") return (Number(b?.rating) || 0) - (Number(a?.rating) || 0);
      return String(b?.id || "").localeCompare(String(a?.id || ""));
    });
    return list;
  }, [liveGames, search, sortBy]);

  return (
    <div className="w-full space-y-5 pb-36">
      {/* Header — no hamburger (☰), minimal: icon + title + search + sort only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Flame className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase leading-none">
                🔥 GAMES MPYA (NEW GAMES FEED)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase">
                LIVE FEED
              </span>
            </div>
            <p className="text-[10px] text-blue-400 font-bold mt-0.5">
              {filteredAndSortedGames.length} Michezo na Mods maalum zilizochaguliwa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-44">
            <input
              type="text"
              placeholder="Tafuta game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-bold"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-blue-400 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Zilizowekwa Hivi Karibuni</option>
              <option value="rating">Rating ya Juu</option>
              <option value="price-asc">Bei: Chini Kwenda Juu</option>
              <option value="price-desc">Bei: Juu Kwenda Chini</option>
            </select>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      {filteredAndSortedGames.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-white uppercase tracking-wide">
            {search.trim() ? "Hakuna Michezo Iliyopatikana" : "Hakuna Michezo Kwenye Games Mpya Bado"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search.trim()
              ? "Jaribu kubadilisha neno la utafutaji."
              : "Fungua Admin Panel (/admin/games) na uwashe kitufe cha \"🌟 Games Mpya [ON]\" kwenye michezo unayotaka ionekane hapa."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredAndSortedGames.map((game, idx) => (
            <FeedCard
              key={game.id || idx}
              game={game}
              index={idx}
              onBuyNow={onBuyNow}
              isUnlocked={game.id ? unlockedGameIds.has(game.id) : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}