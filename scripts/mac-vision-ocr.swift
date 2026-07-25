#!/usr/bin/env swift
/**
 * OCR local Vision macOS — usa PDFPage.thumbnail (rotación correcta).
 * Uso: swift scripts/mac-vision-ocr.swift input.pdf output.txt [from] [to]
 */
import Foundation
import PDFKit
import Vision
import AppKit

guard CommandLine.arguments.count >= 3 else {
  fputs("Uso: swift mac-vision-ocr.swift input.pdf output.txt [from] [to]\n", stderr)
  exit(1)
}

let pdfPath = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]
let fromPage = CommandLine.arguments.count > 3 ? (Int(CommandLine.arguments[3]) ?? 1) : 1

guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)) else {
  fputs("No se abrió PDF\n", stderr)
  exit(2)
}
let total = doc.pageCount
let toPage = CommandLine.arguments.count > 4 ? (Int(CommandLine.arguments[4]) ?? total) : total
let start = max(1, fromPage)
let end = min(total, toPage)

var parts: [String] = []
let scale: CGFloat = 2.5

for i in (start - 1)..<end {
  guard let page = doc.page(at: i) else { continue }
  let bounds = page.bounds(for: .mediaBox)
  let rot = page.rotation % 360
  let swap = (rot == 90 || rot == 270)
  let w = swap ? bounds.height : bounds.width
  let h = swap ? bounds.width : bounds.height
  let target = CGSize(width: max(w * scale, 1), height: max(h * scale, 1))
  let thumb = page.thumbnail(of: target, for: .mediaBox)

  guard let tiff = thumb.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let cgImage = rep.cgImage else {
    fputs("  pág \(i + 1)/\(end): sin imagen\n", stderr)
    parts.append("## Página \(i + 1)\n\n")
    continue
  }

  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = true
  req.recognitionLanguages = ["es-ES", "es", "en-US", "en"]
  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  do {
    try handler.perform([req])
    let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    let text = lines.joined(separator: "\n")
    parts.append("## Página \(i + 1)\n\n\(text)")
    fputs("  pág \(i + 1)/\(end): \(text.count) car.\n", stderr)
  } catch {
    fputs("  pág \(i + 1): error \(error)\n", stderr)
    parts.append("## Página \(i + 1)\n\n")
  }
}

let joined = parts.joined(separator: "\n\n---\n\n")
try joined.write(toFile: outPath, atomically: true, encoding: .utf8)
fputs("OK \(joined.count) car. → \(outPath)\n", stderr)
