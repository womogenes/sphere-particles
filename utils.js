// Rotate one vector (vect) around another (axis) by the specified angle.
// https://stackoverflow.com/questions/67458592/how-would-i-rotate-a-vector-in-3d-space-p5-js
export function rotateAround(vect, axis, angle) {
  // Make sure our axis is a unit vector
  axis = p5.Vector.normalize(axis);

  return p5.Vector.add(
    p5.Vector.mult(vect, cos(angle)),
    p5.Vector.mult(p5.Vector.cross(axis, vect), sin(angle))
  );
}
