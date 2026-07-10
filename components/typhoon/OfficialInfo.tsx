"use client";

import React from "react";
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";

const OFFICIAL_SOURCES = [
  {
    name: "中国应急管理部",
    url: "https://www.mem.gov.cn/",
    desc: "国家应急管理官方门户",
  },
  {
    name: "国家预警信息发布中心",
    url: "https://www.12379.cn/",
    desc: "权威预警发布平台",
  },
  {
    name: "中央气象台台风网",
    url: "http://typhoon.nmc.cn/",
    desc: "中国气象局台风监测",
  },
  {
    name: "日本气象厅 (JMA)",
    url: "https://www.jma.go.jp/bosai/typhoon/",
    desc: "本页数据来源",
  },
];

const SAFETY_TIPS = [
  "关注当地应急管理部门发布的最新预警信息",
  "台风来临前固定好室外物品，关好门窗",
  "避免前往海边、河岸等危险区域",
  "准备应急物资：饮用水、食物、手电筒、药品",
  "保持通讯畅通，关注官方信息发布渠道",
];

export default function OfficialInfo() {
  return (
    <div>
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <Shield size={14} style={{ color: "#3BD5FF" }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#8D9AAF",
          }}
        >
          官方信息与防灾提示
        </span>
      </div>

      {/* Official sources */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            color: "#6B7B95",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          官方预警入口
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OFFICIAL_SOURCES.map((src) => (
            <a
              key={src.url}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                background: "rgba(59, 213, 255, 0.04)",
                border: "1px solid rgba(59, 213, 255, 0.1)",
                textDecoration: "none",
                color: "#e0e6f0",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(59, 213, 255, 0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(59, 213, 255, 0.04)";
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{src.name}</div>
                <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>
                  {src.desc}
                </div>
              </div>
              <ExternalLink size={12} style={{ color: "#6B7B95", flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      {/* Safety tips */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            color: "#F08C3E",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <AlertTriangle size={10} />
          防灾提示
        </div>
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 16px",
            fontSize: 11,
            color: "#8D9AAF",
            lineHeight: 1.8,
          }}
        >
          {SAFETY_TIPS.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 14,
          padding: "8px 10px",
          borderRadius: 6,
          background: "rgba(240, 140, 62, 0.06)",
          border: "1px solid rgba(240, 140, 62, 0.12)",
          fontSize: 10,
          color: "#F08C3E",
          lineHeight: 1.6,
        }}
      >
        <strong>免责声明：</strong>
        本页面台风信息仅供信息参考，不构成任何形式的预警或避灾指导。请以中国应急管理部、中央气象台及当地主管部门发布的正式预警信息为准。
        中国境内风险信息仅引用官方通报和预警入口，不自行推断灾情或登陆结论。
      </div>
    </div>
  );
}
