/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export type TypeProperty = {
  name: string;
  type: string;
  description?: Child;
  required?: boolean;
  defaultValue?: string;
  deprecated?: boolean;
};

/** A semantic two-column table keeps long types readable on narrow screens. */
export function TypeTable({
  properties,
  caption = "Properties",
  emptyLabel = "No properties.",
}: {
  properties: readonly TypeProperty[];
  caption?: string;
  emptyLabel?: string;
}) {
  if (!properties.length)
    return (
      <div class="hx-type-table-empty">
        <p>{caption}</p>
        <p>{emptyLabel}</p>
      </div>
    );
  return (
    <div class="hx-type-table">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Type and description</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr>
              <th scope="row">
                <code>{property.name}</code>
                <span class="hx-property-status">
                  {property.required ? "Required" : "Optional"}
                  {property.deprecated ? " · Deprecated" : ""}
                </span>
              </th>
              <td>
                <code class="hx-property-type">{property.type}</code>
                {property.description ? <div class="hx-property-description">{property.description}</div> : null}
                {property.defaultValue !== undefined ? (
                  <p class="hx-property-default">
                    Default: <code>{property.defaultValue}</code>
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
