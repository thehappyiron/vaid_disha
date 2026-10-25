import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  MapPin,
  Plus,
  Minus,
  Maximize2,
  LocateFixed,
  ArrowUpDown,
  Accessibility,
  Droplets,
  Pill,
  FlaskConical,
  Radiation,
  Baby,
  Eye,
  Ear,
  BedDouble,
  ClipboardList,
  CircleHelp,
  Cross,
  Users,
  Info,
  X,
  Navigation,
  Stethoscope,
} from 'lucide-react';
import type { GraphEdge, GraphNode } from '../../services/pathfindingService';
import {
  FACILITY_PINS,
  type FacilityCategory,
  type FacilityPin,
} from '../../data/facilitiesData';
import { getDepartment } from '../../data/departments';
import hospitalGraph from '../../data/hospitalGraph.json';
import './HospitalFloorMap.css';

interface HospitalFloorMapProps {
  currentFloor: number;
  onSelectFloor: (floor: number) => void;
  startNode?: GraphNode | null;
  destinationNode?: GraphNode | null;
  activeNode?: GraphNode | null;
  pathNodes: GraphNode[];
  pathEdges: GraphEdge[];
  showFacilityPins?: boolean;
  selectedFacilityCategory?: FacilityCategory;
  selectedFacilityId?: string | null;
  onSelectFacility?: (facility: FacilityPin) => void;
}
type View = { x: number; y: number; width: number; height: number };
const nodes = hospitalGraph.nodes as GraphNode[];
const icons = {
  lift: ArrowUpDown,
  stairs: Layers,
  wheelchair: Accessibility,
  toilet: Accessibility,
  water: Droplets,
  pharmacy: Pill,
  lab: FlaskConical,
  xray: Radiation,
  children: Baby,
  eye: Eye,
  ear: Ear,
  ward: BedDouble,
  nurse: Cross,
  registration: ClipboardList,
  help: CircleHelp,
  emergency: Cross,
  waiting: Users,
  ramp: Accessibility,
  clinic: Stethoscope,
};
const world: View = { x: 30, y: 50, width: 1140, height: 860 };
function labelLines(text: string, width: number, size: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line.length + word.length + 1) * size * 0.52 > width) {
      lines.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Illustrative indoor plan with familiar map controls. No GPS or map API. */
export function HospitalFloorMap({
  currentFloor,
  onSelectFloor,
  startNode,
  destinationNode,
  activeNode,
  pathNodes,
  pathEdges,
  showFacilityPins = true,
  selectedFacilityCategory = 'all',
  selectedFacilityId,
  onSelectFacility,
}: HospitalFloorMapProps) {
  const { t } = useTranslation();
  const id = useId().replaceAll(':', '');
  const svgRef = useRef<SVGSVGElement>(null),
    viewportRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>(world);
  const drag = useRef<{
    x: number;
    y: number;
    initial: View;
    moved: boolean;
  } | null>(null);
  const wasDragged = useRef(false);
  const [selection, setSelection] = useState<{
    id: string;
    externalId: string | null | undefined;
  } | null>(null);
  const selectedId =
    selection?.externalId === selectedFacilityId ? selection?.id : null;
  const setSelectedId = (placeId: string | null) =>
    setSelection(
      placeId ? { id: placeId, externalId: selectedFacilityId } : null
    );
  const [zoom, setZoom] = useState(1);
  const floorNodes = useMemo(
    () => nodes.filter((node) => node.floor === currentFloor),
    [currentFloor]
  );
  const places = floorNodes.filter((node) => node.isLandmark);
  const floorLabel = t(`guidance.floor_${currentFloor}`);
  const externalSelection = FACILITY_PINS.find(
    (pin) => pin.id === selectedFacilityId
  )?.nodeId;
  const selected =
    floorNodes.find((node) => node.id === (selectedId || externalSelection)) ||
    (destinationNode?.floor === currentFloor ? destinationNode : null);
  const department = selected?.departmentId
    ? getDepartment(selected.departmentId)
    : undefined;
  const position = activeNode || startNode;
  const segments = pathNodes
    .slice(0, -1)
    .flatMap((node, index) =>
      node.floor === currentFloor && pathNodes[index + 1].floor === currentFloor
        ? [{ from: node, to: pathNodes[index + 1] }]
        : []
    );
  const transition = pathEdges.find(
    (edge) =>
      edge.type !== 'corridor' &&
      pathNodes.some(
        (node) =>
          node.floor === currentFloor &&
          (node.id === edge.from || node.id === edge.to)
      )
  );
  const nameOf = (node: GraphNode) =>
    t(node.nameKey, { defaultValue: node.name });

  function applyView(next: View) {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    const aspect = bounds.width / bounds.height;
    let { width, height } = next;
    if (width / height < aspect) width = height * aspect;
    else height = width / aspect;
    const camera = {
      x: next.x - (width - next.width) / 2,
      y: next.y - (height - next.height) / 2,
      width,
      height,
    };
    view.current = camera;
    svgRef.current?.setAttribute(
      'viewBox',
      `${camera.x} ${camera.y} ${width} ${height}`
    );
    setZoom(world.width / width);
  }
  function zoomBy(factor: number) {
    const current = view.current,
      width = Math.max(300, Math.min(2000, current.width / factor)),
      height = (current.height * width) / current.width;
    applyView({
      x: current.x + (current.width - width) / 2,
      y: current.y + (current.height - height) / 2,
      width,
      height,
    });
  }
  function fitRoute() {
    const points = pathNodes.filter((node) => node.floor === currentFloor);
    if (!points.length) {
      applyView(world);
      return;
    }
    const xs = points.map((node) => node.x),
      ys = points.map((node) => node.y),
      x = Math.min(...xs) - 130,
      y = Math.min(...ys) - 150;
    applyView({
      x,
      y,
      width: Math.max(480, Math.max(...xs) - x + 130),
      height: Math.max(380, Math.max(...ys) - y + 120),
    });
  }
  useEffect(() => {
    const observer = new ResizeObserver(() => applyView(world));
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    applyView(world);
  }, [currentFloor]);
  function selectPlace(node: GraphNode) {
    setSelectedId(node.id);
    const pin = FACILITY_PINS.find((item) => item.nodeId === node.id);
    if (pin) onSelectFacility?.(pin);
    if (
      node.bounds &&
      (svgRef.current?.getBoundingClientRect().width || 0) < 540
    ) {
      applyView({
        x: node.bounds.x - 80,
        y: node.bounds.y - 110,
        width: Math.max(480, node.bounds.width + 160),
        height: Math.max(420, node.bounds.height + 220),
      });
    }
  }

  return (
    <section className="hospital-map" aria-label={t('hospital.map.title')}>
      <div className="hospital-map-heading">
        <div className="hospital-map-heading-copy">
          <span className="hospital-map-eyebrow">
            <Layers size={15} aria-hidden="true" />
            {t('hospital.map.sample')}
          </span>
          <h2>{t('hospital.map.title')}</h2>
          <p>{t(`hospital.map.level${currentFloor}`)}</p>
        </div>
        <div
          className="hospital-map-floors"
          role="group"
          aria-label={t('hospital.map.floor')}
        >
          {hospitalGraph.floors.map((item) => (
            <button
              key={item.level}
              type="button"
              aria-pressed={currentFloor === item.level}
              onClick={() => {
                setSelectedId(null);
                onSelectFloor(item.level);
              }}
              aria-label={t(`guidance.floor_${item.level}`)}
            >
              <strong>{item.level === 0 ? 'G' : item.level}</strong>
              <span>
                {t(`hospital.map.${['ground', 'first', 'second'][item.level]}`)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="hospital-map-route-caption">
        {pathNodes.length ? (
          <>
            <span className="map-route-line" />
            <span>{t('hospital.map.follow')}</span>
          </>
        ) : (
          <>
            <Info size={16} aria-hidden="true" />
            <span>{t('hospital.map.browse')}</span>
          </>
        )}
        <span className="hospital-map-floor-chip">{floorLabel}</span>
      </div>
      <div className="hospital-map-viewport" ref={viewportRef}>
        <svg
          ref={svgRef}
          viewBox="30 65 1140 825"
          role="group"
          aria-label={`${floorLabel} ${t('hospital.map.title')}`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            wasDragged.current = false;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              initial: { ...view.current },
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            if (!drag.current || !svgRef.current) return;
            const dx = event.clientX - drag.current.x,
              dy = event.clientY - drag.current.y;
            if (Math.abs(dx) + Math.abs(dy) < 6 && !drag.current.moved) return;
            drag.current.moved = true;
            wasDragged.current = true;
            svgRef.current.setPointerCapture(event.pointerId);
            const bounds = svgRef.current.getBoundingClientRect(),
              initial = drag.current.initial;
            const next = {
              ...initial,
              x: initial.x - (dx * initial.width) / bounds.width,
              y: initial.y - (dy * initial.height) / bounds.height,
            };
            view.current = next;
            svgRef.current.setAttribute(
              'viewBox',
              `${next.x} ${next.y} ${next.width} ${next.height}`
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <pattern
              id={`${id}-grid`}
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".7" fill="#d3dfd8" />
            </pattern>
            <filter
              id={`${id}-shadow`}
              x="-10%"
              y="-10%"
              width="120%"
              height="125%"
            >
              <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="9"
                floodColor="#71867c"
                floodOpacity=".13"
              />
            </filter>
            {places
              .filter((node) => node.bounds)
              .map((node) => (
                <clipPath key={node.id} id={`${id}-${node.id}`}>
                  <rect
                    x={node.bounds!.x + 10}
                    y={node.bounds!.y + 8}
                    width={node.bounds!.width - 20}
                    height={node.bounds!.height - 16}
                    rx="5"
                  />
                </clipPath>
              ))}
          </defs>
          <g aria-hidden="true">
            <rect
              x="-3000"
              y="-3000"
              width="7200"
              height="7000"
              fill="#edf2ec"
            />
            <rect
              x="-3000"
              y="-3000"
              width="7200"
              height="7000"
              fill={`url(#${id}-grid)`}
            />
            <rect
              x="60"
              y="80"
              width="1080"
              height="730"
              rx="26"
              fill="#fffdf8"
              stroke="#c5d0c9"
              strokeWidth="5"
              filter={`url(#${id}-shadow)`}
            />
            <path
              d="M95 375H1110 M600 110V810 M600 640H1095"
              fill="none"
              stroke="#f1f0e9"
              strokeWidth="66"
              strokeLinejoin="round"
            />
            {currentFloor === 0 && (
              <path
                d="M600 810V850H945"
                fill="none"
                stroke="#d8dfd8"
                strokeWidth="36"
                strokeLinecap="round"
              />
            )}
            <path d="M579 809H621" stroke="#edf2ec" strokeWidth="10" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={currentFloor === 1 ? 135 + col * 66 : 685 + col * 33}
                  y={currentFloor === 1 ? 720 + row * 14 : 548 + row * 14}
                  width={currentFloor === 1 ? 42 : 22}
                  height="8"
                  rx="3"
                  fill={currentFloor === 2 ? '#e4e9e4' : '#a6c7dd'}
                />
              ))
            )}
          </g>
          {places
            .filter((node) => node.bounds)
            .map((node) => {
              const b = node.bounds!,
                Icon = icons[node.icon as keyof typeof icons] || MapPin;
              const compact = b.height < 100,
                core = b.width <= 110,
                matched =
                  node.id === selected?.id || node.id === destinationNode?.id;
              const dimmed =
                showFacilityPins &&
                selectedFacilityCategory !== 'all' &&
                node.facilityCategory !== selectedFacilityCategory;
              const size = compact || core ? 24 : 31,
                lines = labelLines(
                  nameOf(node),
                  b.width - (compact ? 62 : 32),
                  size
                );
              const numbered = node.roomNumber && /^\d$/.test(node.roomNumber);
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  data-map-place={node.id}
                  aria-label={t('hospital.map.select', {
                    place: `${nameOf(node)}${numbered ? `, ${t('hospital.map.room', { room: node.roomNumber })}` : ''}`,
                  })}
                  className={`map-place map-place-${node.mapTone || 'neutral'}${matched ? ' is-selected' : ''}${dimmed ? ' is-muted' : ''}`}
                  onClick={() => {
                    if (!wasDragged.current) selectPlace(node);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPlace(node);
                    }
                  }}
                >
                  <title>
                    {nameOf(node)} ·{' '}
                    {t(node.landmarkKey || '', { defaultValue: node.landmark })}
                  </title>
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    rx="12"
                    className="map-room-fill"
                    strokeWidth={matched ? 4 : 2}
                  />
                  <rect
                    x={
                      node.x > b.x + b.width
                        ? b.x + b.width - 5
                        : Math.min(
                            Math.max(node.x - 17, b.x + 10),
                            b.x + b.width - 44
                          )
                    }
                    y={
                      node.y < b.y
                        ? b.y - 4
                        : node.y > b.y + b.height
                          ? b.y + b.height - 4
                          : node.y - 17
                    }
                    width={node.x > b.x + b.width ? 10 : 34}
                    height={node.x > b.x + b.width ? 34 : 9}
                    fill="#fffdf8"
                  />
                  <g clipPath={`url(#${id}-${node.id})`} pointerEvents="none">
                    <Icon
                      x={
                        b.x +
                        (compact
                          ? 16
                          : core
                            ? (b.width - 28) / 2
                            : b.width - 44)
                      }
                      y={b.y + (compact ? 18 : 20)}
                      width={compact ? 24 : 28}
                      height={compact ? 24 : 28}
                      className="map-room-icon"
                      strokeWidth={1.7}
                    />
                    {numbered && (
                      <text
                        x={b.x + 18}
                        y={b.y + 49}
                        className="map-room-number"
                      >
                        {node.roomNumber!.padStart(2, '0')}
                      </text>
                    )}
                    {node.roomNumber?.startsWith('Ward') && (
                      <text
                        x={b.x + 20}
                        y={b.y + 43}
                        className="map-ward-number"
                      >
                        {node.roomNumber}
                      </text>
                    )}
                    <text
                      x={b.x + (compact ? 52 : core ? b.width / 2 : 18)}
                      y={
                        b.y +
                        (compact
                          ? 30
                          : core
                            ? 68
                            : numbered || node.roomNumber?.startsWith('Ward')
                              ? 86
                              : 78)
                      }
                      textAnchor={core ? 'middle' : 'start'}
                      fontSize={size}
                      className="map-room-label"
                    >
                      {lines.slice(0, 3).map((line, index) => (
                        <tspan
                          key={index}
                          x={b.x + (compact ? 52 : core ? b.width / 2 : 18)}
                          dy={index ? size + 6 : 0}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                    {node.roomNumber?.startsWith('G-') && (
                      <text
                        x={b.x + 18}
                        y={b.y + b.height - 19}
                        className="map-room-code"
                      >
                        {node.roomNumber}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          <g aria-hidden="true" pointerEvents="none">
            {segments.map(({ from, to }) => (
              <path
                key={`halo-${from.id}-${to.id}`}
                d={`M${from.x} ${from.y}L${to.x} ${to.y}`}
                stroke="#fff"
                strokeWidth="17"
                strokeLinecap="round"
              />
            ))}
            {segments.map(({ from, to }) => (
              <path
                key={`route-${from.id}-${to.id}`}
                d={`M${from.x} ${from.y}L${to.x} ${to.y}`}
                stroke="#1675d1"
                strokeWidth="9"
                strokeLinecap="round"
              />
            ))}
            {startNode?.floor === currentFloor &&
              startNode.id !== position?.id && (
                <circle
                  cx={startNode.x}
                  cy={startNode.y}
                  r="10"
                  fill="#fff"
                  stroke="#1675d1"
                  strokeWidth="5"
                />
              )}
            {position?.floor === currentFloor && (
              <>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="30"
                  fill="#1675d1"
                  opacity=".15"
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="16"
                  fill="#1675d1"
                  stroke="#fff"
                  strokeWidth="5"
                />
              </>
            )}
            {destinationNode?.floor === currentFloor && (
              <>
                <circle
                  cx={destinationNode.x}
                  cy={destinationNode.y}
                  r="21"
                  fill="#0b8067"
                  stroke="#fff"
                  strokeWidth="5"
                />
                <MapPin
                  x={destinationNode.x - 25}
                  y={destinationNode.y - 60}
                  width="50"
                  height="50"
                  fill="#0b8067"
                  stroke="white"
                  strokeWidth="2"
                />
              </>
            )}
            {currentFloor === 0 && (
              <>
                <Navigation
                  x="584"
                  y="776"
                  width="32"
                  height="32"
                  stroke="#315a68"
                  fill="#fff"
                />
                <text
                  x="600"
                  y="883"
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="650"
                  fill="#3c5b5a"
                >
                  {t('hospital.places.entrance-main')}
                </text>
              </>
            )}
          </g>
        </svg>
        <div className="hospital-map-north" aria-hidden="true">
          <Navigation size={16} fill="currentColor" />
          <span>N</span>
        </div>
        <div
          className="hospital-map-controls"
          role="group"
          aria-label={t('hospital.map.title')}
        >
          <button
            type="button"
            onClick={() => zoomBy(1.35)}
            aria-label={t('hospital.map.zoomIn')}
            disabled={zoom >= 3.7}
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.35)}
            aria-label={t('hospital.map.zoomOut')}
            disabled={zoom <= world.width / 1950}
          >
            <Minus size={20} />
          </button>
          <button
            type="button"
            onClick={() => applyView(world)}
            aria-label={t('hospital.map.reset')}
          >
            <Maximize2 size={18} />
          </button>
          {pathNodes.length > 0 && (
            <button
              type="button"
              onClick={fitRoute}
              aria-label={t('hospital.map.fitRoute')}
            >
              <LocateFixed size={20} />
            </button>
          )}
        </div>
        <span className="hospital-map-pan-hint">{t('hospital.map.pan')}</span>
      </div>
      <div className="hospital-map-legend">
        <span>
          <i className="map-position-dot" />
          {t('hospital.map.you')}
        </span>
        <span>
          <MapPin size={15} className="map-destination-icon" />
          {t('hospital.map.destination')}
        </span>
        <span>
          <ArrowUpDown size={15} />
          {t('hospital.map.lift')}
        </span>
      </div>
      {destinationNode && destinationNode.floor !== currentFloor && (
        <button
          type="button"
          className="hospital-map-floor-link"
          onClick={() => onSelectFloor(destinationNode.floor)}
        >
          <Layers size={16} />
          {t('hospital.map.otherFloor', { floor: destinationNode.floor })}
          {transition && <ArrowUpDown size={16} />}
        </button>
      )}
      <div className="hospital-map-place-picker">
        <label htmlFor={`${id}-place`}>{t('hospital.map.places')}</label>
        <select
          id={`${id}-place`}
          value={selected?.id || ''}
          onChange={(event) => {
            const node = floorNodes.find(
              (item) => item.id === event.target.value
            );
            if (node) selectPlace(node);
          }}
        >
          <option value="">{floorLabel}</option>
          {places.map((node) => (
            <option key={node.id} value={node.id}>
              {nameOf(node)}
              {node.roomNumber ? ` · ${node.roomNumber}` : ''}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="hospital-map-details" aria-live="polite">
          <div className="hospital-map-details-title">
            <MapPin size={20} />
            <div>
              <h3>{nameOf(selected)}</h3>
              <span>
                {selected.roomNumber ? `${selected.roomNumber} · ` : ''}
                {floorLabel}
              </span>
            </div>
            {selectedId && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={t('hospital.map.close')}
              >
                <X size={17} />
              </button>
            )}
          </div>
          <p>
            <strong>{t('hospital.map.landmark')}:</strong>{' '}
            {t(selected.landmarkKey || '', { defaultValue: selected.landmark })}
          </p>
          {department && (
            <dl>
              <div>
                <dt>{t('hospital.map.doctor')}</dt>
                <dd>{department.doctorName}</dd>
              </div>
              {department.category === 'consultation' && (
                <>
                  <div>
                    <dt>{t('hospital.map.hours')}</dt>
                    <dd>{department.opdHours}</dd>
                  </div>
                  <div>
                    <dt>{t('hospital.map.average')}</dt>
                    <dd>
                      {t('hospital.map.minutes', {
                        count: department.averageConsultationMinutes,
                      })}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          )}
        </div>
      )}
      <p className="hospital-map-note">{t('hospital.map.schematic')}</p>
    </section>
  );
}
