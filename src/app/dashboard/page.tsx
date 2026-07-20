"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Code2,
  FileCode2,
  Globe,
  Wallet,
  Layers,
  Zap,
  ArrowUpRight,
  Blocks,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
} from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { StatCard } from "@/components/ui/stat-card";
import { TEMPLATES, Template } from "@/lib/clarity/templates";

const CUSTOM_KEY = "clarityforge-custom-templates";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadCustomTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: Template[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(templates));
}

export default function DashboardPage() {
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formCode, setFormCode] = useState("");

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormTag("");
    setFormCode("");
    setEditingSlug(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (t: Template) => {
    setFormName(t.name);
    setFormDesc(t.description);
    setFormTag(t.tag);
    setFormCode(t.code);
    setEditingSlug(t.slug);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formCode.trim()) return;

    const slug = editingSlug || slugify(formName);
    const template: Template = {
      slug,
      name: formName.trim(),
      description: formDesc.trim(),
      tag: formTag.trim() || "Custom",
      code: formCode.trim(),
    };

    const updated: Template[] = editingSlug
      ? customTemplates.map((t) => (t.slug === editingSlug ? template : t))
      : (() => {
          // Deduplicate slug against built-in templates
          let finalSlug = slug;
          let counter = 1;
          while (TEMPLATES.some((t) => t.slug === finalSlug)) {
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
          template.slug = finalSlug;
          return [...customTemplates, template];
        })();

    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    resetForm();
  };

  const handleDelete = (slug: string) => {
    const updated = customTemplates.filter((t) => t.slug !== slug);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
  };

  const allTemplates = [...TEMPLATES, ...customTemplates];
  const totalCount = allTemplates.length;

  return (
    <>
      <Nav />
      <main className="pt-24 pb-20 px-8 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-12">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-3">
                Project overview
              </h1>
              <p className="text-muted max-w-xl leading-relaxed">
                ClarityForge — browser IDE for writing, simulating, and deploying
                Clarity smart contracts on Stacks.
              </p>
            </div>
            <button
              onClick={showForm ? resetForm : openCreateForm}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-colors ${
                showForm
                  ? "border border-line text-muted hover:text-text"
                  : "text-bg bg-text hover:bg-text/85"
              }`}
            >
              {showForm ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Create template
                </>
              )}
            </button>
          </div>

          {/* Create/Edit form */}
          {showForm && (
            <div className="border border-line bg-surface p-6 mb-12">
              <h3 className="text-sm font-bold mb-5">
                {editingSlug ? "Edit template" : "Create custom template"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-1.5 block">
                    Name
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Contract"
                    className="w-full bg-bg border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-1.5 block">
                    Tag
                  </label>
                  <input
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="DeFi, NFT, Custom..."
                    className="w-full bg-bg border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-1.5 block">
                    Description
                  </label>
                  <input
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="What does it do?"
                    className="w-full bg-bg border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-1.5 block">
                  Clarity Code
                </label>
                <textarea
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="(define-fungible-token my-token u1000000)..."
                  rows={8}
                  className="w-full bg-bg border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors resize-y"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formCode.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-bg bg-text hover:bg-text/85 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingSlug ? "Save changes" : "Create template"}
                </button>
                <button
                  onClick={resetForm}
                  className="text-[11px] text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-line mb-16">
            <StatCard
              label="Templates"
              value={String(totalCount)}
              description={`${TEMPLATES.length} built-in · ${customTemplates.length} custom`}
              icon={FileCode2}
            />
            <StatCard
              label="Coverage"
              value="6 categories"
              description="Tokens · NFTs · DeFi · Governance · Payments · Identity"
              icon={Layers}
            />
            <StatCard
              label="Environment"
              value="3 modes"
              description="In-browser VM simulator, local Clarinet check, and wallet-connected testnet deploy."
              icon={Blocks}
            />
            <StatCard
              label="Zero install"
              value="Browser"
              description="No CLI, no Clarinet, no chain state. Open the browser and start building."
              icon={Globe}
            />
          </div>

          {/* Features grid */}
          <div className="mb-16">
            <h2 className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-8">
              Core features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line">
              {[
                {
                  icon: Code2,
                  title: "Syntax engine",
                  desc: "Real Clarity tokenizer + AST analyzer in TypeScript. 30+ keywords, definition extraction, cost estimation, trait resolution.",
                },
                {
                  icon: Zap,
                  title: "Stateful VM",
                  desc: "In-browser simulator tracks storage, balances, and tokens across multiple calls. Execute and see results instantly.",
                },
                {
                  icon: Wallet,
                  title: "One-click deploy",
                  desc: "Connect Leather or Xverse wallet. Deploy contracts to Stacks testnet. Explorer links verify on-chain results.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-bg p-8 hover:bg-text/[0.02] transition-colors"
                >
                  <f.icon className="w-5 h-5 text-muted/40 mb-4" />
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Template library table */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs text-muted font-mono tracking-[0.2em] uppercase">
                Template library &middot; {totalCount}
              </h2>
              <Link
                href="/templates"
                className="text-xs text-muted/60 hover:text-text transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="border border-line">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Template
                    </th>
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Category
                    </th>
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Description
                    </th>
                    <th className="text-right text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allTemplates.map((t, i) => {
                    const isCustom = customTemplates.some((ct) => ct.slug === t.slug);
                    return (
                      <tr
                        key={t.slug}
                        className={`${
                          i < allTemplates.length - 1 ? "border-b border-line" : ""
                        } hover:bg-text/[0.02] transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{t.name}</span>
                            {isCustom && (
                              <span className="text-[9px] text-muted/40 font-mono bg-text/[0.04] px-1.5 py-0.5 rounded-sm">
                                custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted/60 font-mono">{t.tag}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted/70 leading-relaxed">
                            {t.description}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/demo?template=${t.slug}`}
                              className="text-xs text-muted/50 hover:text-text transition-colors"
                            >
                              Open →
                            </Link>
                            {isCustom && (
                              <>
                                <button
                                  onClick={() => openEditForm(t)}
                                  className="text-xs text-muted/40 hover:text-text transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(t.slug)}
                                  className="text-xs text-muted/40 hover:text-red-400/70 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
